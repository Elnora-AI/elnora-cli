"""Input validation — GUID format, page size bounds."""

from __future__ import annotations

import re

from .config import MAX_PAGE_SIZE
from .errors import ValidationError

_GUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Map validation labels to the correct CLI list command
_LABEL_TO_COMMAND = {
    "project_id": "elnora projects list",
    "project": "elnora projects list",
    "task_id": "elnora tasks list",
    "file_id": "elnora files list --project <PROJECT_ID>",
    "file_ref": "elnora files list --project <PROJECT_ID>",
    "org_id": "elnora orgs list",
    "org": "elnora orgs list",
    "folder_id": "elnora folders list --project <PROJECT_ID>",
    "folder": "elnora folders list --project <PROJECT_ID>",
    "membership_id": "elnora orgs members <ORG_ID>",
    "invitation_id": "elnora orgs invitations <ORG_ID>",
    "user_id": "elnora account users",
    "target_project": "elnora projects list",
    "target_project_id": "elnora projects list",
    "version_id": "elnora files versions <FILE_ID>",
    "task": "elnora tasks list",
    "key_id": "elnora api-keys list",
}


def validate_guid(value: str, label: str) -> str:
    """Validate a string is a valid GUID/UUID format."""
    if not _GUID_RE.match(value):
        suggestion_cmd = _LABEL_TO_COMMAND.get(label, f"elnora {label}s list")
        raise ValidationError(
            f"Invalid {label}: '{value}'. Expected UUID format (e.g., bfdc6fbd-40ed-4042-9ea7-c79a5ec90085).",
            suggestion=f"Run: {suggestion_cmd}",
        )
    return value


def validate_page(value: int) -> int:
    """Validate page number is positive."""
    if value < 1:
        raise ValidationError(
            f"Invalid page: {value}. Must be >= 1.",
            suggestion="Use a positive page number.",
        )
    return value


def validate_page_size(value: int, label: str = "page size") -> int:
    """Validate a numeric limit is within bounds (1-MAX_PAGE_SIZE)."""
    if value < 1 or value > MAX_PAGE_SIZE:
        raise ValidationError(
            f"Invalid {label}: {value}. Must be between 1 and {MAX_PAGE_SIZE}.",
            suggestion=f"Use a value between 1 and {MAX_PAGE_SIZE}.",
        )
    return value


_PATH_SAFE_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def validate_path_segment(value: str, label: str) -> str:
    """Validate a string is safe for use in a URL path segment (no traversal)."""
    if not value or not _PATH_SAFE_RE.match(value):
        raise ValidationError(
            f"Invalid {label}: '{value}'. Must contain only alphanumeric characters, hyphens, and underscores.",
            suggestion=f"Check the {label} value and try again.",
        )
    return value


def validate_int(value: str, label: str) -> int:
    """Validate and convert a string to an integer."""
    try:
        return int(value)
    except (ValueError, TypeError):
        raise ValidationError(
            f"Invalid {label}: '{value}'. Expected an integer.",
            suggestion=f"Provide a numeric value for {label}.",
        )
