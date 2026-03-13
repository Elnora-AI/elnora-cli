"""Output contract for the Elnora Platform CLI.

Success: JSON to stdout, exit 0
Error:   JSON to stderr, exit 1
Warning: JSON to stderr, exit 0

Credentials are scrubbed from all output (success, error, and warning).
"""

from __future__ import annotations

import json
import os
import re
import sys
from contextlib import contextmanager
from typing import NoReturn

# ---------------------------------------------------------------------------
# Error hierarchy
# ---------------------------------------------------------------------------


class ElnoraError(Exception):
    """Base error with machine-readable code and agent-friendly suggestion."""

    def __init__(self, message: str, *, suggestion: str | None = None, code: str = "ELNORA_ERROR"):
        super().__init__(message)
        self.suggestion = suggestion
        self.code = code


class AuthError(ElnoraError):
    def __init__(self, message: str | None = None, *, suggestion: str | None = None):
        super().__init__(
            message or "No Elnora API key found. Set ELNORA_API_KEY environment variable.",
            suggestion=suggestion or "Get your API key from platform.elnora.ai > Settings > API Keys",
            code="AUTH_FAILED",
        )


class NotFoundError(ElnoraError):
    def __init__(self, entity: str, identifier: str):
        super().__init__(
            f"{entity} not found: {identifier}",
            suggestion="Check the identifier and try again.",
            code="NOT_FOUND",
        )


class RateLimitError(ElnoraError):
    def __init__(self, message: str | None = None):
        super().__init__(
            message or "Elnora API rate limit exceeded.",
            suggestion="Wait a moment and retry.",
            code="RATE_LIMITED",
        )


class ValidationError(ElnoraError):
    def __init__(self, message: str, suggestion: str | None = None):
        super().__init__(message, suggestion=suggestion, code="VALIDATION_ERROR")


class ServerError(ElnoraError):
    def __init__(self, message: str | None = None):
        super().__init__(
            message or "Elnora API server error.",
            suggestion="Try again later. If the issue persists, contact support@elnora.ai.",
            code="SERVER_ERROR",
        )


# ---------------------------------------------------------------------------
# Credential scrubbing
# ---------------------------------------------------------------------------

_SCRUB_KEY_VALUE_RE = re.compile(
    r'"?(?:ELNORA_API_KEY|ELNORA_MCP_API_KEY|api_key|x-api-key)"?\s*[=:]\s*"?([^\s"\']+)"?',
    re.IGNORECASE,
)

# Catch bare token-like strings (20+ alphanumeric/dash/underscore chars, matching minimum API key length)
_SCRUB_LONG_TOKEN_RE = re.compile(r"elnora_live_[a-zA-Z0-9_-]{8,}|[a-zA-Z0-9_-]{40,}")


def scrub(text: str) -> str:
    """Remove API key patterns and long token-like strings from text."""
    for env_var in ("ELNORA_API_KEY", "ELNORA_MCP_API_KEY"):
        key = os.environ.get(env_var, "")
        if key and key in text:
            text = text.replace(key, "[REDACTED]")
    text = _SCRUB_KEY_VALUE_RE.sub("[REDACTED]", text)
    text = _SCRUB_LONG_TOKEN_RE.sub("[REDACTED]", text)
    return text


# ---------------------------------------------------------------------------
# Output functions
# ---------------------------------------------------------------------------


def _filter_fields(data: list[dict], fields: list[str]) -> list[dict]:
    """Filter each dict to only the specified keys."""
    return [{k: row[k] for k in fields if k in row} for row in data]


def _scrub_data(obj: object) -> object:
    """Recursively scrub sensitive strings from a data structure before serialization."""
    if isinstance(obj, str):
        return scrub(obj)
    if isinstance(obj, dict):
        return {k: _scrub_data(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_scrub_data(item) for item in obj]
    return obj


def output_success(data: object, *, compact: bool = False, fmt: str = "json", fields: list[str] | None = None) -> None:
    """Print success payload to stdout.

    All string values are scrubbed for credentials before output.
    """
    # Scrub sensitive data before any serialization
    data = _scrub_data(data)

    if fmt == "csv":
        import csv
        import io

        # Normalise to list of dicts
        if isinstance(data, dict) and "items" in data:
            rows: list[dict] = data["items"]
        elif isinstance(data, list):
            rows = data
        else:
            rows = [data] if isinstance(data, dict) else [{"value": data}]

        if fields:
            rows = _filter_fields(rows, fields)

        if not rows:
            return

        all_keys: list[str] = []
        seen: set[str] = set()
        for row in rows:
            for k in row:
                if k not in seen:
                    all_keys.append(k)
                    seen.add(k)

        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=all_keys, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
        print(buf.getvalue(), end="")
        return

    # JSON output
    if fields and isinstance(data, (list, dict)):
        if isinstance(data, dict) and "items" in data:
            data = {**data, "items": _filter_fields(data["items"], fields)}
        elif isinstance(data, list):
            data = _filter_fields(data, fields)
        elif isinstance(data, dict):
            data = {k: data[k] for k in fields if k in data}

    if compact:
        json.dump(data, sys.stdout, separators=(",", ":"), default=str)
    else:
        json.dump(data, sys.stdout, indent=2, default=str)
    sys.stdout.write("\n")


# Exit code mapping: distinct codes help scripts and agents branch on error type
_EXIT_CODES: dict[type, int] = {
    ValidationError: 2,
    AuthError: 3,
    NotFoundError: 4,
    RateLimitError: 5,
    ServerError: 6,
}


def output_error(exc: BaseException, *, compact: bool = False) -> NoReturn:
    """Print error to stderr and exit with a typed exit code."""
    payload: dict[str, str] = {"error": scrub(str(exc))}
    if isinstance(exc, ElnoraError):
        payload["code"] = exc.code
        if exc.suggestion:
            payload["suggestion"] = exc.suggestion
    else:
        payload["code"] = type(exc).__name__

    if compact:
        print(json.dumps(payload, separators=(",", ":")), file=sys.stderr)
    else:
        print(json.dumps(payload, indent=2), file=sys.stderr)
    sys.exit(_EXIT_CODES.get(type(exc), 1))


def output_warning(message: str, *, code: str = "WARNING", compact: bool = False) -> None:
    """Print warning to stderr (does not exit)."""
    payload = {"warning": message, "code": code}
    if compact:
        print(json.dumps(payload, separators=(",", ":")), file=sys.stderr)
    else:
        print(json.dumps(payload, indent=2), file=sys.stderr)


@contextmanager
def handle_errors(ctx):
    """Context manager for consistent error handling across commands."""
    try:
        yield
    except (KeyboardInterrupt, SystemExit):
        raise
    except Exception as exc:
        output_error(exc, compact=ctx.obj.get("compact", False))
