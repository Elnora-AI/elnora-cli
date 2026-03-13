"""Profile management — read/write ~/.elnora/profiles.toml for multi-org support.

Profiles store org-scoped API keys under named sections:

    [default]
    api_key = "elnora_live_orgA_key..."

    [profiles.university]
    api_key = "elnora_live_uni_key..."
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from .errors import AuthError, ValidationError

# Reuse CONFIG_DIR from client (avoids circular import — it's just Path.home() / ".elnora")
CONFIG_DIR = Path.home() / ".elnora"
PROFILES_FILE = CONFIG_DIR / "profiles.toml"
LEGACY_CONFIG_FILE = CONFIG_DIR / "config.toml"

PROFILE_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,31}$")


def _write_secure_file(path: Path, content: str) -> None:
    """Write a file with restrictive permissions (0o600 on Unix)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if os.name != "nt":
        path.parent.chmod(0o700)
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            os.write(fd, content.encode("utf-8"))
        finally:
            os.close(fd)
    else:
        path.write_text(content, encoding="utf-8")


def validate_profile_name(name: str) -> str:
    """Validate and return a profile name. Raises ValidationError if invalid."""
    if not PROFILE_NAME_RE.match(name):
        raise ValidationError(
            f"Invalid profile name '{name}'. "
            "Must be 1-32 chars, lowercase alphanumeric and hyphens, starting with alphanumeric.",
            suggestion="Examples: default, work, university, lab-2",
        )
    return name


# ---------------------------------------------------------------------------
# TOML parsing (section-aware, minimal subset)
# ---------------------------------------------------------------------------


def _parse_profiles_toml(text: str) -> dict[str, dict[str, str]]:
    """Parse profiles.toml into {profile_name: {key: value}}.

    Understands [default] and [profiles.<name>] section headers.
    """
    profiles: dict[str, dict[str, str]] = {}
    current_section: str | None = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        # Section header
        if stripped.startswith("[") and stripped.endswith("]"):
            header = stripped[1:-1].strip()
            if header == "default":
                current_section = "default"
                profiles.setdefault("default", {})
            elif header.startswith("profiles."):
                name = header[len("profiles.") :]
                current_section = name
                profiles.setdefault(name, {})
            else:
                current_section = None
            continue

        # Key = value within a section
        if current_section is not None and "=" in stripped:
            raw_key, _, val = stripped.partition("=")
            raw_key = raw_key.strip()
            val = val.strip().strip('"').strip("'")
            profiles[current_section][raw_key] = val

    return profiles


def _serialize_profiles(profiles: dict[str, dict[str, str]]) -> str:
    """Serialize profiles dict back to TOML string."""
    parts: list[str] = ["# Elnora CLI profiles", "# Managed by: elnora auth login", ""]

    # Write [default] first if it exists
    if "default" in profiles:
        parts.append("[default]")
        for k, v in profiles["default"].items():
            parts.append(f'{k} = "{v}"')
        parts.append("")

    # Write named profiles in sorted order
    for name in sorted(profiles):
        if name == "default":
            continue
        parts.append(f"[profiles.{name}]")
        for k, v in profiles[name].items():
            parts.append(f'{k} = "{v}"')
        parts.append("")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def load_profiles() -> dict[str, dict[str, str]]:
    """Load all profiles from ~/.elnora/profiles.toml.

    Returns dict like {"default": {"api_key": "..."}, "work": {"api_key": "..."}}.
    Returns {} if file doesn't exist.
    """
    if not PROFILES_FILE.is_file():
        return {}
    try:
        text = PROFILES_FILE.read_text(encoding="utf-8")
    except OSError:
        return {}
    profiles = _parse_profiles_toml(text)
    return profiles


def save_profile(name: str, api_key: str) -> Path:
    """Save an API key under a profile name in profiles.toml.

    Creates the file if it doesn't exist. Preserves other profiles.
    Returns path to profiles.toml.
    """
    validate_profile_name(name)
    profiles = load_profiles()
    profiles[name] = {"api_key": api_key}

    content = _serialize_profiles(profiles)
    _write_secure_file(PROFILES_FILE, content)

    return PROFILES_FILE


def remove_profile(name: str) -> bool:
    """Remove a profile from profiles.toml. Returns True if removed, False if not found."""
    profiles = load_profiles()
    if name not in profiles:
        return False
    del profiles[name]

    if not profiles:
        # No profiles left — delete the file
        try:
            PROFILES_FILE.unlink()
        except OSError:
            pass
        return True

    content = _serialize_profiles(profiles)
    _write_secure_file(PROFILES_FILE, content)

    return True


def get_api_key(profile_name: str = "default") -> str:
    """Get API key for the given profile.

    Raises AuthError if profile not found or has no key.
    """
    profiles = load_profiles()
    if profile_name not in profiles:
        available = list(profiles.keys())
        if available:
            suggestion = f"Available profiles: {', '.join(available)}"
        else:
            suggestion = "Run 'elnora auth login' to set up a profile."
        raise AuthError(
            f"Profile '{profile_name}' not found.",
            suggestion=suggestion,
        )
    key = profiles[profile_name].get("api_key", "")
    if not key:
        raise AuthError(
            f"Profile '{profile_name}' has no API key.",
            suggestion="Run: elnora auth login --profile " + profile_name,
        )
    return key


def list_profile_names() -> list[str]:
    """Return list of all profile names (including 'default' if it exists)."""
    return list(load_profiles().keys())


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------


def migrate_config_if_needed() -> bool:
    """Migrate ~/.elnora/config.toml to profiles.toml [default] if needed.

    Non-destructive: config.toml is left in place.
    Returns True if migration occurred, False otherwise.
    """
    if PROFILES_FILE.is_file():
        return False
    if not LEGACY_CONFIG_FILE.is_file():
        return False

    # Read key from config.toml (same parser as ElnoraClient._load_config_file)
    try:
        text = LEGACY_CONFIG_FILE.read_text(encoding="utf-8")
    except OSError:
        return False

    api_key = ""
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        raw_key, _, val = line.partition("=")
        if raw_key.strip() == "api_key":
            api_key = val.strip().strip('"').strip("'")
            break

    if not api_key:
        return False

    save_profile("default", api_key)
    return True
