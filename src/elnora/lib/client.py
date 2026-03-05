"""Elnora Platform API client — lightweight, zero external dependencies beyond stdlib.

Uses urllib.request (not requests/httpx) to keep the dependency footprint at zero.
All endpoint URLs and config live in config.py.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, NoReturn

from . import config
from .errors import (
    AuthError,
    ElnoraError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
    scrub,
)
from .validation import validate_guid

# Keys allowed through _load_env — everything else is ignored
_ENV_WHITELIST = {"ELNORA_API_KEY", "ELNORA_MCP_API_KEY"}

# Sentinel files that mark a project root (any common project marker)
_ROOT_MARKERS = ("pyproject.toml", "setup.py", "setup.cfg", "package.json", ".git")

# User config directory: ~/.elnora/
CONFIG_DIR = Path.home() / ".elnora"
CONFIG_FILE = CONFIG_DIR / "config.toml"


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Block redirects so X-API-Key is never forwarded to a third-party host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Only show hostname in error — full URL may contain attacker-controlled data
        parsed = urllib.parse.urlparse(newurl)
        raise ElnoraError(
            f"Unexpected redirect to {parsed.hostname} (blocked for security)",
            code="UNEXPECTED_REDIRECT",
        )


class ElnoraClient:
    """Thin wrapper around the Elnora Platform REST API."""

    def __init__(self, api_key: str):
        self._api_key = api_key
        self._last_request_time = 0.0
        self._opener = urllib.request.build_opener(_NoRedirectHandler)

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    @classmethod
    def from_env(cls) -> ElnoraClient:
        """Build client from environment.

        Resolution order:
        1. ELNORA_API_KEY env var
        2. ELNORA_MCP_API_KEY env var (alias)
        3. .env file in nearest project root
        4. ~/.elnora/config.toml

        Validates key starts with ``elnora_live_``.
        """
        key = os.environ.get("ELNORA_API_KEY", "").strip()
        if not key:
            key = os.environ.get("ELNORA_MCP_API_KEY", "").strip()
        if not key:
            cls._load_env()
            key = os.environ.get("ELNORA_API_KEY", "").strip()
            if not key:
                key = os.environ.get("ELNORA_MCP_API_KEY", "").strip()
        if not key:
            key = cls._load_config_file()
        if not key:
            raise AuthError(
                "No Elnora API key found. Run 'elnora auth login' to set up, "
                "or set ELNORA_API_KEY environment variable.",
            )
        if not key.startswith("elnora_live_"):
            raise AuthError("ELNORA_API_KEY must start with 'elnora_live_'.")
        if len(key) < 20:
            raise AuthError(
                "ELNORA_API_KEY looks too short. Check your key and try again.",
            )
        return cls(key)

    @staticmethod
    def _load_config_file() -> str:
        """Read API key from ~/.elnora/config.toml (simple TOML subset)."""
        if not CONFIG_FILE.is_file():
            return ""
        # Warn if config file has insecure permissions (group/other readable)
        if os.name != "nt":
            try:
                mode = CONFIG_FILE.stat().st_mode
                if mode & 0o077:
                    from .errors import output_warning

                    output_warning(
                        "~/.elnora/config.toml has insecure permissions. Run: chmod 600 ~/.elnora/config.toml",
                        code="INSECURE_PERMISSIONS",
                    )
            except OSError:
                pass
        try:
            text = CONFIG_FILE.read_text(encoding="utf-8")
        except OSError:
            return ""
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            raw_key, _, val = line.partition("=")
            if raw_key.strip() != "api_key":
                continue
            val = val.strip().strip('"').strip("'")
            return val
        return ""

    @staticmethod
    def save_config(api_key: str) -> Path:
        """Write API key to ~/.elnora/config.toml."""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        if os.name != "nt":
            # Ensure directory is owner-only (umask may have made it world-readable)
            CONFIG_DIR.chmod(0o700)
        content = f'# Elnora CLI configuration\n# Created by: elnora auth login\n\napi_key = "{api_key}"\n'
        if os.name != "nt":
            # Atomic create with restricted permissions — no TOCTOU window
            fd = os.open(CONFIG_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            try:
                os.write(fd, content.encode("utf-8"))
            finally:
                os.close(fd)
        else:
            CONFIG_FILE.write_text(content, encoding="utf-8")
        return CONFIG_FILE

    @staticmethod
    def _load_env() -> None:
        """Load .env from repo root (found by walking parents for root markers).

        Only whitelisted keys are injected. Handles ``export`` prefix, quotes,
        inline ``#`` comments.
        """
        # Walk up to find repo root
        current = Path.cwd().resolve()
        env_path: Path | None = None
        for _ in range(20):  # safety limit
            if any((current / marker).exists() for marker in _ROOT_MARKERS):
                candidate = current / ".env"
                if candidate.is_file():
                    env_path = candidate
                break
            parent = current.parent
            if parent == current:
                break
            current = parent

        if env_path is None:
            return

        # Warn if .env has insecure permissions
        if os.name != "nt":
            try:
                mode = env_path.stat().st_mode
                if mode & 0o077:
                    from .errors import output_warning

                    output_warning(
                        f"{env_path} has insecure permissions. Run: chmod 600 {env_path}",
                        code="INSECURE_PERMISSIONS",
                    )
            except OSError:
                pass

        try:
            fh = open(env_path, encoding="utf-8")
        except OSError:
            return
        with fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                # Strip optional 'export ' prefix
                if line.startswith("export "):
                    line = line[7:]
                if "=" not in line:
                    continue
                raw_key, _, raw_val = line.partition("=")
                raw_key = raw_key.strip()
                if raw_key not in _ENV_WHITELIST:
                    continue
                # Strip inline comment (outside quotes)
                raw_val = raw_val.strip()
                if raw_val and raw_val[0] in ('"', "'"):
                    quote = raw_val[0]
                    end = raw_val.find(quote, 1)
                    if end != -1:
                        raw_val = raw_val[1:end]
                else:
                    # Strip inline comment
                    comment_idx = raw_val.find(" #")
                    if comment_idx != -1:
                        raw_val = raw_val[:comment_idx]
                raw_val = raw_val.strip()
                if raw_val and not os.environ.get(raw_key):
                    os.environ[raw_key] = raw_val

    # ------------------------------------------------------------------
    # Low-level HTTP
    # ------------------------------------------------------------------

    def _request(
        self,
        endpoint: str,
        body: dict[str, Any] | None = None,
        *,
        method: str = "GET",
        query_params: dict[str, Any] | None = None,
    ) -> dict[str, Any] | str:
        """Call Elnora API.

        - 100 ms minimum between requests (throttle)
        - SSRF check: hostname must be exactly platform.elnora.ai
        - 30 s timeout
        """
        # Simple per-request throttle
        now = time.monotonic()
        elapsed = now - self._last_request_time
        if elapsed < 0.1:
            time.sleep(0.1 - elapsed)
        self._last_request_time = time.monotonic()

        url = f"{config.BASE_URL}{endpoint}"

        # Append query string
        if query_params:
            qs = urllib.parse.urlencode(query_params)
            url = f"{url}?{qs}"

        # SSRF prevention: verify scheme, hostname, and no userinfo (@)
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https":
            raise ElnoraError(
                f"SSRF blocked: refusing non-HTTPS scheme '{parsed.scheme}'",
                code="SSRF_BLOCKED",
            )
        if "@" in url.split("?")[0]:
            raise ElnoraError(
                "SSRF blocked: URL contains userinfo (@)",
                code="SSRF_BLOCKED",
            )
        if parsed.hostname != "platform.elnora.ai":
            raise ElnoraError(
                f"SSRF blocked: refusing to connect to {parsed.hostname}",
                code="SSRF_BLOCKED",
            )

        headers = {**config.DEFAULT_HEADERS, "X-API-Key": self._api_key}

        data = None
        if method in ("POST", "PUT", "PATCH") and body is not None:
            data = json.dumps(body).encode("utf-8")
        else:
            # Strip Content-Type for bodyless requests
            headers.pop("Content-Type", None)

        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with self._opener.open(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                # Some endpoints return raw text, not JSON
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return raw
        except urllib.error.HTTPError as e:
            body_text = ""
            try:
                body_text = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            self._handle_http_error(e.code, body_text)
        except urllib.error.URLError as e:
            raise ElnoraError(
                f"Network error: {scrub(str(e.reason))}",
                suggestion="Check your internet connection and try again.",
                code="NETWORK_ERROR",
            ) from e

    def _handle_http_error(self, status: int, body: str) -> NoReturn:
        """Map HTTP status codes to typed errors."""
        body = scrub(body)
        if status == 401:
            raise AuthError("Invalid Elnora API key. Check ELNORA_API_KEY in .env.")
        if status == 403:
            raise AuthError("Elnora API access forbidden. Your key may lack permissions.")
        if status == 404:
            raise NotFoundError("resource", body[:200] if body else "not found")
        if status == 422:
            msg = body[:500] if body else "Validation error"
            raise ValidationError(msg, suggestion="Check your request parameters.")
        if status == 429:
            raise RateLimitError()
        if 500 <= status < 600:
            raise ServerError(f"Server error (HTTP {status}): {body[:500] if body else 'Unknown'}")
        raise ElnoraError(
            f"Elnora API error (HTTP {status}): {body[:500] if body else 'Unknown'}",
            code=f"HTTP_{status}",
        )

    # ------------------------------------------------------------------
    # Projects
    # ------------------------------------------------------------------

    def list_projects(self, *, page: int = 1, page_size: int = 25) -> dict:
        """List all projects."""
        return self._request(
            config.ENDPOINTS["projects"],
            query_params={"page": page, "pageSize": page_size},
        )

    def get_project(self, project_id: str) -> dict:
        """Get a single project by ID."""
        validate_guid(project_id, "project_id")
        endpoint = config.ENDPOINTS["project"].replace("{id}", project_id)
        return self._request(endpoint)

    def create_project(
        self,
        *,
        name: str,
        description: str | None = None,
        icon: str | None = None,
    ) -> dict:
        """Create a new project."""
        body: dict[str, Any] = {"name": name}
        if description is not None:
            body["description"] = description
        if icon is not None:
            body["icon"] = icon
        return self._request(config.ENDPOINTS["projects"], body, method="POST")

    # ------------------------------------------------------------------
    # Tasks
    # ------------------------------------------------------------------

    def list_tasks(self, *, page: int = 1, page_size: int = 25) -> dict:
        """List all tasks."""
        return self._request(
            config.ENDPOINTS["tasks"],
            query_params={"page": page, "pageSize": page_size},
        )

    def list_project_tasks(self, project_id: str, *, page: int = 1, page_size: int = 25) -> dict:
        """List tasks within a project."""
        validate_guid(project_id, "project_id")
        endpoint = config.ENDPOINTS["project_tasks"].replace("{id}", project_id)
        return self._request(endpoint, query_params={"page": page, "pageSize": page_size})

    def get_task(self, task_id: str) -> dict:
        """Get a single task by ID."""
        validate_guid(task_id, "task_id")
        endpoint = config.ENDPOINTS["task"].replace("{id}", task_id)
        return self._request(endpoint)

    def create_task(
        self,
        *,
        project_id: str,
        title: str | None = None,
        initial_message: str | None = None,
        context_file_ids: list[str] | None = None,
    ) -> dict:
        """Create a new task in a project."""
        validate_guid(project_id, "project_id")
        body: dict[str, Any] = {"projectId": project_id}
        if title is not None:
            body["title"] = title
        if initial_message is not None:
            body["initialMessage"] = initial_message
        if context_file_ids is not None:
            body["contextFileIds"] = context_file_ids
        return self._request(config.ENDPOINTS["tasks"], body, method="POST")

    def send_message(
        self,
        task_id: str,
        *,
        content: str,
        referenced_file_ids: list[str] | None = None,
    ) -> dict:
        """Send a message to a task."""
        validate_guid(task_id, "task_id")
        endpoint = config.ENDPOINTS["task_messages"].replace("{id}", task_id)
        body: dict[str, Any] = {"content": content}
        if referenced_file_ids is not None:
            body["referencedFileIds"] = referenced_file_ids
        return self._request(endpoint, body, method="POST")

    def get_messages(
        self,
        task_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ) -> dict:
        """Get messages for a task."""
        validate_guid(task_id, "task_id")
        endpoint = config.ENDPOINTS["task_messages"].replace("{id}", task_id)
        params: dict[str, Any] = {"limit": limit}
        if cursor is not None:
            params["cursor"] = cursor
        return self._request(endpoint, query_params=params)

    def update_task(
        self,
        task_id: str,
        *,
        title: str | None = None,
        status: str | None = None,
    ) -> dict:
        """Update a task's title or status."""
        validate_guid(task_id, "task_id")
        endpoint = config.ENDPOINTS["task"].replace("{id}", task_id)
        body: dict[str, Any] = {}
        if title is not None:
            body["title"] = title
        if status is not None:
            body["status"] = status
        return self._request(endpoint, body, method="PUT")

    def archive_task(self, task_id: str) -> dict:
        """Archive (delete) a task."""
        validate_guid(task_id, "task_id")
        endpoint = config.ENDPOINTS["task"].replace("{id}", task_id)
        return self._request(endpoint, method="DELETE")

    # ------------------------------------------------------------------
    # Files
    # ------------------------------------------------------------------

    def list_files(self, project_id: str, *, page: int = 1, page_size: int = 25) -> dict:
        """List files in a project."""
        validate_guid(project_id, "project_id")
        endpoint = config.ENDPOINTS["project_files"].replace("{id}", project_id)
        return self._request(endpoint, query_params={"page": page, "pageSize": page_size})

    def get_file(self, file_id: str) -> dict:
        """Get file metadata."""
        validate_guid(file_id, "file_id")
        endpoint = config.ENDPOINTS["file"].replace("{id}", file_id)
        return self._request(endpoint)

    def get_file_content(self, file_id: str) -> str:
        """Get file content as raw text."""
        validate_guid(file_id, "file_id")
        endpoint = config.ENDPOINTS["file_content"].replace("{id}", file_id)
        result = self._request(endpoint)
        # If _request already returned a string (non-JSON), return it directly
        if isinstance(result, str):
            return result
        # If the API wraps content in JSON, extract it
        if isinstance(result, dict) and "content" in result:
            return result["content"]
        return json.dumps(result)

    def get_file_versions(self, file_id: str, *, page: int = 1, page_size: int = 25) -> dict:
        """Get version history for a file."""
        validate_guid(file_id, "file_id")
        endpoint = config.ENDPOINTS["file_versions"].replace("{id}", file_id)
        return self._request(endpoint, query_params={"page": page, "pageSize": page_size})

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search_tasks(self, *, query: str, page: int = 1, page_size: int = 25) -> dict:
        """Search tasks by query string."""
        return self._request(
            config.ENDPOINTS["search_tasks"],
            query_params={"q": query, "page": page, "pageSize": page_size},
        )

    def search_files(self, *, query: str, page: int = 1, page_size: int = 25) -> dict:
        """Search files by query string."""
        return self._request(
            config.ENDPOINTS["search_files"],
            query_params={"q": query, "page": page, "pageSize": page_size},
        )
