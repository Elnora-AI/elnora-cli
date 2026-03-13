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
from .validation import validate_guid, validate_path_segment

_ALLOWED_UPLOAD_HOSTS = (".amazonaws.com", ".storage.googleapis.com", ".blob.core.windows.net")


def validate_upload_url(url: str) -> None:
    """Validate a presigned upload URL — SSRF prevention for API-returned URLs."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        raise ValidationError(
            f"Upload URL must use HTTPS, got '{parsed.scheme}'.",
            suggestion="Contact support — the API returned an insecure upload URL.",
        )
    if "@" in url.split("?")[0]:
        raise ValidationError(
            "Upload URL contains userinfo (@).",
            suggestion="Contact support — the API returned a suspicious upload URL.",
        )
    hostname = parsed.hostname or ""
    if not any(hostname.endswith(suffix) for suffix in _ALLOWED_UPLOAD_HOSTS):
        raise ValidationError(
            f"Upload URL hostname '{hostname}' is not an allowed storage provider.",
            suggestion="Contact support — the API returned an unexpected upload URL host.",
        )


def anon_request(endpoint, body=None, *, method="GET", query_params=None):
    """Call Elnora API without authentication (for public endpoints)."""
    url = f"{config.BASE_URL}{endpoint}"
    if query_params:
        qs = urllib.parse.urlencode(query_params)
        url = f"{url}?{qs}"
    # SSRF prevention: same checks as _request()
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "platform.elnora.ai":
        raise ElnoraError(
            f"SSRF blocked: refusing to connect to {parsed.hostname}",
            code="SSRF_BLOCKED",
        )
    if "@" in url.split("?")[0]:
        raise ElnoraError(
            "SSRF blocked: URL contains userinfo (@)",
            code="SSRF_BLOCKED",
        )
    headers = {k: v for k, v in config.DEFAULT_HEADERS.items()}
    if method == "GET":
        headers.pop("Content-Type", None)
    data = None
    if method in ("POST", "PUT") and body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    opener = urllib.request.build_opener(_NoRedirectHandler)
    try:
        with opener.open(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
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
        body_text = scrub(body_text)
        if e.code == 404:
            raise NotFoundError("resource", body_text[:200] if body_text else "not found")
        if e.code == 422:
            raise ValidationError(body_text[:500] if body_text else "Validation error")
        if e.code == 429:
            raise RateLimitError()
        if 500 <= e.code < 600:
            raise ServerError(f"Server error (HTTP {e.code}): {body_text[:500]}")
        raise ElnoraError(f"API error (HTTP {e.code}): {body_text[:500]}", code=f"HTTP_{e.code}")
    except urllib.error.URLError as e:
        raise ElnoraError(
            f"Network error: {scrub(str(e.reason))}",
            suggestion="Check your internet connection and try again.",
            code="NETWORK_ERROR",
        ) from e


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

    # Profile set by CLI --profile flag, read via ctx.obj["profile"]
    _active_profile: str | None = None

    def __init__(self, api_key: str):
        self._api_key = api_key
        self._last_request_time = 0.0
        self._opener = urllib.request.build_opener(_NoRedirectHandler)

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    @classmethod
    def from_env(cls, profile: str | None = None) -> ElnoraClient:
        """Build client from environment.

        Resolution order (when --profile is NOT given):
        1. ELNORA_API_KEY env var
        2. ELNORA_MCP_API_KEY env var (alias)
        3. .env file in nearest project root
        4. ~/.elnora/profiles.toml (active profile)
        5. ~/.elnora/config.toml (legacy fallback)

        When --profile IS given explicitly, profiles.toml takes priority
        over env vars so that profile selection is always honoured.

        Validates key starts with ``elnora_live_``.
        """
        explicit_profile = profile or cls._active_profile
        key = ""

        # When a profile is explicitly requested, try it first — fail if not found
        if explicit_profile:
            from .profiles import get_api_key, migrate_config_if_needed

            migrate_config_if_needed()
            key = get_api_key(explicit_profile)

        # Fall back to env vars / .env / profiles / legacy config
        if not key:
            key = os.environ.get("ELNORA_API_KEY", "").strip()
        if not key:
            key = os.environ.get("ELNORA_MCP_API_KEY", "").strip()
        if not key:
            cls._load_env()
            key = os.environ.get("ELNORA_API_KEY", "").strip()
            if not key:
                key = os.environ.get("ELNORA_MCP_API_KEY", "").strip()
        if not key:
            from .profiles import get_api_key, migrate_config_if_needed

            migrate_config_if_needed()
            effective_profile = os.environ.get("ELNORA_PROFILE", "").strip() or "default"
            try:
                key = get_api_key(effective_profile)
            except AuthError:
                pass
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

        max_retries = 3
        for attempt in range(max_retries + 1):
            try:
                with self._opener.open(req, timeout=30) as resp:
                    raw = resp.read().decode("utf-8")
                    # Some endpoints return raw text, not JSON
                    try:
                        return json.loads(raw)
                    except json.JSONDecodeError:
                        return raw
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < max_retries:
                    retry_after = e.headers.get("Retry-After")
                    if retry_after:
                        try:
                            wait = min(float(retry_after), 30.0)
                        except (ValueError, TypeError):
                            wait = 2**attempt
                    else:
                        wait = 2**attempt  # 1s, 2s, 4s
                    try:
                        e.read()
                    except Exception:
                        pass
                    time.sleep(wait)
                    self._last_request_time = time.monotonic()
                    # Rebuild request since data stream may be consumed
                    req = urllib.request.Request(url, data=data, headers=headers, method=method)
                    continue
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

    def search_file_content(
        self,
        query: str,
        project_id: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> dict:
        """Search file contents via full-text search."""
        params: dict[str, Any] = {"q": query, "page": page, "pageSize": page_size}
        if project_id:
            params["projectId"] = project_id
        return self._request(config.ENDPOINTS["search_file_content"], query_params=params)

    # ------------------------------------------------------------------
    # Organizations
    # ------------------------------------------------------------------

    def list_organizations(self) -> dict:
        return self._request(config.ENDPOINTS["organizations"])

    def get_organization(self, org_id: str) -> dict:
        validate_guid(org_id, "org_id")
        return self._request(config.ENDPOINTS["organization"].replace("{id}", org_id))

    def create_organization(self, *, name: str, description: str | None = None) -> dict:
        body: dict[str, Any] = {"name": name}
        if description is not None:
            body["description"] = description
        return self._request(config.ENDPOINTS["organizations"], body, method="POST")

    def update_organization(self, org_id: str, *, name: str | None = None, description: str | None = None) -> dict:
        validate_guid(org_id, "org_id")
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        return self._request(config.ENDPOINTS["organization"].replace("{id}", org_id), body, method="PUT")

    def list_organization_members(self, org_id: str) -> dict:
        validate_guid(org_id, "org_id")
        return self._request(config.ENDPOINTS["organization_members"].replace("{id}", org_id))

    def update_organization_member_role(self, org_id: str, membership_id: str, *, role: str) -> dict:
        validate_guid(org_id, "org_id")
        validate_guid(membership_id, "membership_id")
        endpoint = config.ENDPOINTS["organization_member_role"].replace("{id}", org_id).replace("{mid}", membership_id)
        return self._request(endpoint, {"role": role}, method="PUT")

    def remove_organization_member(self, org_id: str, membership_id: str) -> dict:
        validate_guid(org_id, "org_id")
        validate_guid(membership_id, "membership_id")
        endpoint = config.ENDPOINTS["organization_member"].replace("{id}", org_id).replace("{mid}", membership_id)
        return self._request(endpoint, method="DELETE")

    def get_organization_billing(self, org_id: str) -> dict:
        validate_guid(org_id, "org_id")
        return self._request(config.ENDPOINTS["organization_billing"].replace("{id}", org_id))

    def update_organization_stripe_customer(self, org_id: str, *, stripe_customer_id: str) -> dict:
        validate_guid(org_id, "org_id")
        endpoint = config.ENDPOINTS["organization_stripe_customer"].replace("{id}", org_id)
        return self._request(endpoint, {"stripeCustomerId": stripe_customer_id}, method="PUT")

    def set_default_organization(self, org_id: str) -> dict:
        """Set an organization as the user's default."""
        validate_guid(org_id, "org_id")
        endpoint = config.ENDPOINTS["organization_set_default"].replace("{id}", org_id)
        return self._request(endpoint, method="PUT")

    def delete_organization(self, org_id: str) -> dict:
        """Delete an organization (SystemAdmin only). This is irreversible."""
        validate_guid(org_id, "org_id")
        endpoint = config.ENDPOINTS["organization_delete"].replace("{id}", org_id)
        return self._request(endpoint, method="DELETE")

    def list_all_organizations(self) -> dict:
        """List all organizations in the platform (SystemAdmin only)."""
        return self._request(config.ENDPOINTS["organizations_all"])

    # ------------------------------------------------------------------
    # Organization Invitations
    # ------------------------------------------------------------------

    def send_invitation(self, org_id: str, *, email: str, role: str = "Member") -> dict:
        validate_guid(org_id, "org_id")
        endpoint = config.ENDPOINTS["org_invitations"].replace("{orgId}", org_id)
        return self._request(endpoint, {"email": email, "role": role}, method="POST")

    def list_invitations(self, org_id: str) -> dict:
        validate_guid(org_id, "org_id")
        return self._request(config.ENDPOINTS["org_invitations"].replace("{orgId}", org_id))

    def cancel_invitation(self, org_id: str, invitation_id: str) -> dict:
        validate_guid(org_id, "org_id")
        validate_guid(invitation_id, "invitation_id")
        endpoint = config.ENDPOINTS["org_invitation"].replace("{orgId}", org_id).replace("{invId}", invitation_id)
        return self._request(endpoint, method="DELETE")

    def get_invitation_info(self, token: str) -> dict:
        validate_path_segment(token, "invitation token")
        return self._request(config.ENDPOINTS["invitation_info"].replace("{token}", token))

    def accept_invitation(self, token: str) -> dict:
        validate_path_segment(token, "invitation token")
        return self._request(config.ENDPOINTS["invitation_accept"].replace("{token}", token), method="POST")

    # ------------------------------------------------------------------
    # Folders
    # ------------------------------------------------------------------

    def list_folders(self, project_id: str) -> dict:
        validate_guid(project_id, "project_id")
        return self._request(config.ENDPOINTS["project_folders"].replace("{id}", project_id))

    def create_folder(self, project_id: str, *, name: str, parent_id: str | None = None) -> dict:
        validate_guid(project_id, "project_id")
        body: dict[str, Any] = {"name": name}
        if parent_id is not None:
            body["parentId"] = parent_id
        return self._request(config.ENDPOINTS["project_folders"].replace("{id}", project_id), body, method="POST")

    def rename_folder(self, folder_id: str, *, name: str) -> dict:
        validate_guid(folder_id, "folder_id")
        return self._request(config.ENDPOINTS["folder"].replace("{id}", folder_id), {"name": name}, method="PUT")

    def move_folder(self, folder_id: str, *, parent_id: str | None) -> dict:
        validate_guid(folder_id, "folder_id")
        endpoint = config.ENDPOINTS["folder_move"].replace("{id}", folder_id)
        return self._request(endpoint, {"parentId": parent_id}, method="PUT")

    def delete_folder(self, folder_id: str) -> dict:
        validate_guid(folder_id, "folder_id")
        return self._request(config.ENDPOINTS["folder"].replace("{id}", folder_id), method="DELETE")

    # ------------------------------------------------------------------
    # Organization Library
    # ------------------------------------------------------------------

    def list_library_files(self, org_id: str, *, page: int = 1, page_size: int = 25) -> dict:
        validate_guid(org_id, "org_id")
        return self._request(
            config.ENDPOINTS["library_files"].replace("{orgId}", org_id),
            query_params={"page": page, "pageSize": page_size},
        )

    def list_library_folders(self, org_id: str) -> dict:
        validate_guid(org_id, "org_id")
        return self._request(config.ENDPOINTS["library_folders"].replace("{orgId}", org_id))

    def create_library_folder(self, org_id: str, *, name: str, parent_id: str | None = None) -> dict:
        validate_guid(org_id, "org_id")
        body: dict[str, Any] = {"name": name}
        if parent_id is not None:
            body["parentId"] = parent_id
        return self._request(config.ENDPOINTS["library_folders"].replace("{orgId}", org_id), body, method="POST")

    def rename_library_folder(self, org_id: str, folder_id: str, *, name: str) -> dict:
        validate_guid(org_id, "org_id")
        validate_guid(folder_id, "folder_id")
        return self._request(
            config.ENDPOINTS["library_folder"].replace("{orgId}", org_id).replace("{id}", folder_id),
            {"name": name},
            method="PUT",
        )

    def delete_library_folder(self, org_id: str, folder_id: str) -> dict:
        validate_guid(org_id, "org_id")
        validate_guid(folder_id, "folder_id")
        return self._request(
            config.ENDPOINTS["library_folder"].replace("{orgId}", org_id).replace("{id}", folder_id),
            method="DELETE",
        )

    # ------------------------------------------------------------------
    # Projects (new methods)
    # ------------------------------------------------------------------

    def update_project(
        self, project_id: str, *, name: str | None = None, description: str | None = None, icon: str | None = None
    ) -> dict:
        validate_guid(project_id, "project_id")
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        if icon is not None:
            body["icon"] = icon
        return self._request(config.ENDPOINTS["project"].replace("{id}", project_id), body, method="PUT")

    def archive_project(self, project_id: str) -> dict:
        validate_guid(project_id, "project_id")
        return self._request(config.ENDPOINTS["project"].replace("{id}", project_id), method="DELETE")

    def list_project_members(self, project_id: str) -> dict:
        validate_guid(project_id, "project_id")
        return self._request(config.ENDPOINTS["project_members"].replace("{id}", project_id))

    def add_project_member(self, project_id: str, *, user_id: str, role: str = "Member") -> dict:
        validate_guid(project_id, "project_id")
        return self._request(
            config.ENDPOINTS["project_members"].replace("{id}", project_id),
            {"userId": user_id, "role": role},
            method="POST",
        )

    def update_project_member_role(self, project_id: str, user_id: str, *, role: str) -> dict:
        validate_guid(project_id, "project_id")
        endpoint = config.ENDPOINTS["project_member_role"].replace("{id}", project_id).replace("{uid}", user_id)
        return self._request(endpoint, {"role": role}, method="PUT")

    def remove_project_member(self, project_id: str, user_id: str) -> dict:
        validate_guid(project_id, "project_id")
        endpoint = config.ENDPOINTS["project_member"].replace("{id}", project_id).replace("{uid}", user_id)
        return self._request(endpoint, method="DELETE")

    def leave_project(self, project_id: str) -> dict:
        validate_guid(project_id, "project_id")
        return self._request(config.ENDPOINTS["project_leave"].replace("{id}", project_id), method="POST")

    # ------------------------------------------------------------------
    # Files (new methods)
    # ------------------------------------------------------------------

    def create_file(
        self, *, project_id: str, name: str, folder_id: str | None = None, file_type: str | None = None
    ) -> dict:
        validate_guid(project_id, "project_id")
        body: dict[str, Any] = {"projectId": project_id, "name": name}
        if folder_id is not None:
            body["folderId"] = folder_id
        if file_type is not None:
            body["fileType"] = file_type
        return self._request(config.ENDPOINTS["files"], body, method="POST")

    def initiate_upload(
        self,
        *,
        project_id: str,
        file_name: str,
        content_type: str = "application/octet-stream",
        file_size_bytes: int,
    ) -> dict:
        validate_guid(project_id, "project_id")
        return self._request(
            config.ENDPOINTS["file_upload"],
            {
                "projectId": project_id,
                "fileName": file_name,
                "contentType": content_type,
                "fileSizeBytes": file_size_bytes,
            },
            method="POST",
        )

    def confirm_upload(self, file_id: str) -> dict:
        validate_guid(file_id, "file_id")
        return self._request(config.ENDPOINTS["file_upload_confirm"].replace("{id}", file_id), method="POST")

    def download_file(self, file_id: str) -> str:
        validate_guid(file_id, "file_id")
        result = self._request(config.ENDPOINTS["file_download"].replace("{id}", file_id))
        if isinstance(result, str):
            return result
        if isinstance(result, dict) and "content" in result:
            return result["content"]
        return json.dumps(result)

    def update_file(self, file_id: str, *, name: str | None = None, folder_id: str | None = None) -> dict:
        validate_guid(file_id, "file_id")
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if folder_id is not None:
            body["folderId"] = folder_id
        return self._request(config.ENDPOINTS["file"].replace("{id}", file_id), body, method="PUT")

    def archive_file(self, file_id: str) -> dict:
        validate_guid(file_id, "file_id")
        return self._request(config.ENDPOINTS["file"].replace("{id}", file_id), method="DELETE")

    def get_file_version_content(self, file_id: str, version_id: str) -> dict:
        validate_guid(file_id, "file_id")
        validate_guid(version_id, "version_id")
        endpoint = config.ENDPOINTS["file_version_content"].replace("{id}", file_id).replace("{vid}", version_id)
        return self._request(endpoint)

    def create_file_version(self, file_id: str, *, content: str | None = None) -> dict:
        validate_guid(file_id, "file_id")
        body: dict[str, Any] = {}
        if content is not None:
            body["content"] = content
        return self._request(config.ENDPOINTS["file_versions"].replace("{id}", file_id), body, method="POST")

    def restore_file_version(self, file_id: str, version_id: str) -> dict:
        validate_guid(file_id, "file_id")
        validate_guid(version_id, "version_id")
        endpoint = config.ENDPOINTS["file_version_restore"].replace("{id}", file_id).replace("{vid}", version_id)
        return self._request(endpoint, method="POST")

    def promote_file(self, file_id: str, *, visibility: str) -> dict:
        validate_guid(file_id, "file_id")
        endpoint = config.ENDPOINTS["file_promote"].replace("{id}", file_id)
        return self._request(endpoint, {"visibility": visibility}, method="POST")

    def fork_file(self, file_id: str, *, target_project_id: str) -> dict:
        validate_guid(file_id, "file_id")
        validate_guid(target_project_id, "target_project_id")
        endpoint = config.ENDPOINTS["file_fork"].replace("{id}", file_id)
        return self._request(endpoint, {"targetProjectId": target_project_id}, method="POST")

    def create_working_copy(self, file_id: str, *, task_id: str | None = None) -> dict:
        validate_guid(file_id, "file_id")
        params = {}
        if task_id is not None:
            params["taskId"] = task_id
        endpoint = config.ENDPOINTS["file_working_copy"].replace("{id}", file_id)
        return self._request(endpoint, query_params=params if params else None, method="POST")

    def commit_working_copy(self, file_id: str) -> dict:
        validate_guid(file_id, "file_id")
        return self._request(config.ENDPOINTS["file_commit"].replace("{id}", file_id), method="POST")

    def batch_initiate_upload(self, *, items: list[dict[str, Any]]) -> dict:
        """Batch initiate uploads for up to 50 files."""
        return self._request(config.ENDPOINTS["file_upload_batch"], {"items": items}, method="POST")

    def list_org_files(self, org_id: str, *, page: int = 1, page_size: int = 25) -> dict:
        validate_guid(org_id, "org_id")
        return self._request(
            config.ENDPOINTS["org_files"].replace("{orgId}", org_id),
            query_params={"page": page, "pageSize": page_size},
        )

    # ------------------------------------------------------------------
    # Search (new)
    # ------------------------------------------------------------------

    def search_all(self, *, query: str, page: int = 1, page_size: int = 25) -> dict:
        return self._request(
            config.ENDPOINTS["search_all"],
            query_params={"q": query, "page": page, "pageSize": page_size},
        )

    # ------------------------------------------------------------------
    # API Keys
    # ------------------------------------------------------------------

    def create_api_key(self, *, name: str, scopes: list[str] | None = None) -> dict:
        body: dict[str, Any] = {"name": name}
        if scopes is not None:
            body["scopes"] = scopes
        return self._request(config.ENDPOINTS["api_keys"], body, method="POST")

    def list_api_keys(self) -> dict:
        return self._request(config.ENDPOINTS["api_keys"])

    def revoke_api_key(self, key_id: str) -> dict:
        validate_guid(key_id, "key_id")
        return self._request(config.ENDPOINTS["api_key"].replace("{id}", key_id), method="DELETE")

    def get_api_key_policy(self) -> dict:
        """Get the API key creation policy for the organization."""
        return self._request(config.ENDPOINTS["api_key_policy"])

    def set_api_key_policy(self, *, policy: str) -> dict:
        """Set the API key creation policy (admins_only or all_members)."""
        return self._request(config.ENDPOINTS["api_key_policy"], {"policy": policy}, method="PUT")

    # ------------------------------------------------------------------
    # Audit
    # ------------------------------------------------------------------

    def list_audit_log(
        self, org_id: str, *, page: int = 1, page_size: int = 25, action: str | None = None, user_id: str | None = None
    ) -> dict:
        validate_guid(org_id, "org_id")
        params: dict[str, Any] = {"page": page, "pageSize": page_size}
        if action is not None:
            params["action"] = action
        if user_id is not None:
            params["userId"] = user_id
        return self._request(config.ENDPOINTS["audit_log"].replace("{orgId}", org_id), query_params=params)

    # ------------------------------------------------------------------
    # Feedback
    # ------------------------------------------------------------------

    def submit_feedback(self, *, title: str, description: str) -> dict:
        return self._request(config.ENDPOINTS["feedback"], {"title": title, "description": description}, method="POST")

    # ------------------------------------------------------------------
    # Account
    # ------------------------------------------------------------------

    def get_account(self, user_id: int) -> dict:
        return self._request(config.ENDPOINTS["account_user"].replace("{id}", str(user_id)))

    def update_account(self, user_id: int, *, first_name: str | None = None, last_name: str | None = None) -> dict:
        body: dict[str, Any] = {}
        if first_name is not None:
            body["firstName"] = first_name
        if last_name is not None:
            body["lastName"] = last_name
        return self._request(config.ENDPOINTS["account_user"].replace("{id}", str(user_id)), body, method="PUT")

    # ------------------------------------------------------------------
    # User Agreements
    # ------------------------------------------------------------------

    def accept_agreement(self, *, document_version_id: int) -> dict:
        return self._request(
            config.ENDPOINTS["user_agreement"], {"documentVersionId": document_version_id}, method="POST"
        )

    def list_agreements(self) -> dict:
        return self._request(config.ENDPOINTS["user_agreements"])

    def delete_account(self) -> dict:
        """Delete the current user's account. Irreversible."""
        return self._request(config.ENDPOINTS["account_delete"], method="DELETE")

    def list_users(self, *, state: str | None = None, ref_code: str | None = None) -> dict:
        """List all users (SystemAdmin only)."""
        params: dict[str, Any] = {}
        if state is not None:
            params["state"] = state
        if ref_code is not None:
            params["refCode"] = ref_code
        return self._request(config.ENDPOINTS["account_users"], query_params=params if params else None)

    # ------------------------------------------------------------------
    # Legal Document Versions (SystemAdmin)
    # ------------------------------------------------------------------

    def add_legal_doc_version(
        self,
        *,
        document_type: str,
        version: str,
        content: str,
        effective_date: str | None = None,
    ) -> dict:
        """Add a new legal document version (SystemAdmin only)."""
        body: dict[str, Any] = {"documentType": document_type, "version": version, "content": content}
        if effective_date is not None:
            body["effectiveDate"] = effective_date
        return self._request(config.ENDPOINTS["legal_doc_version"], body, method="POST")

    def update_legal_doc_version(
        self,
        version_id: int,
        *,
        content: str | None = None,
        effective_date: str | None = None,
    ) -> dict:
        """Update a legal document version (SystemAdmin only)."""
        body: dict[str, Any] = {}
        if content is not None:
            body["content"] = content
        if effective_date is not None:
            body["effectiveDate"] = effective_date
        endpoint = config.ENDPOINTS["legal_doc_version_id"].replace("{id}", str(version_id))
        return self._request(endpoint, body, method="PUT")

    def delete_legal_doc_version(self, version_id: int) -> dict:
        """Delete a legal document version (SystemAdmin only). Irreversible."""
        endpoint = config.ENDPOINTS["legal_doc_version_id"].replace("{id}", str(version_id))
        return self._request(endpoint, method="DELETE")

    # ------------------------------------------------------------------
    # Feature Flags (SystemAdmin)
    # ------------------------------------------------------------------

    def list_feature_flags(self) -> dict:
        """List all global feature flags (SystemAdmin only)."""
        return self._request(config.ENDPOINTS["feature_flags"])

    def get_feature_flag(self, key: str) -> dict:
        """Get a feature flag value (SystemAdmin only)."""
        validate_path_segment(key, "feature flag key")
        endpoint = config.ENDPOINTS["feature_flag"].replace("{key}", key)
        return self._request(endpoint)

    def set_feature_flag(self, key: str, *, value: bool) -> dict:
        """Set a feature flag value (SystemAdmin only)."""
        validate_path_segment(key, "feature flag key")
        endpoint = config.ENDPOINTS["feature_flag"].replace("{key}", key)
        return self._request(endpoint, {"value": value}, method="PUT")
