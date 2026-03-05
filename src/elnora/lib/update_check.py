"""Lightweight update checker — runs at most once per day, never blocks."""

import json
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

from .config import __version__

_CACHE_DIR = Path.home() / ".elnora"
_CACHE_FILE = _CACHE_DIR / "version-check.json"
_CHECK_INTERVAL = 86400  # 24 hours
_PYPI_URL = "https://pypi.org/pypi/elnora/json"
_TIMEOUT = 3  # seconds


def check_for_update():
    """Print a warning if a newer version is available on PyPI. Fails silently."""
    try:
        cached = _read_cache()
        if cached and time.time() - cached.get("checked_at", 0) < _CHECK_INTERVAL:
            latest = cached.get("latest")
        else:
            latest = _fetch_latest()
            _write_cache(latest)

        if latest and _is_newer(latest, __version__):
            print(
                f"\n  Update available: {__version__} -> {latest}\n  Run: uv tool upgrade elnora\n",
                file=sys.stderr,
            )
    except Exception:
        pass


def _fetch_latest():
    req = Request(_PYPI_URL, headers={"Accept": "application/json"})
    with urlopen(req, timeout=_TIMEOUT) as resp:
        data = json.loads(resp.read())
    return data["info"]["version"]


def _read_cache():
    try:
        return json.loads(_CACHE_FILE.read_text())
    except Exception:
        return None


def _write_cache(latest):
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _CACHE_FILE.write_text(json.dumps({"latest": latest, "checked_at": time.time()}))
    except Exception:
        pass


def _is_newer(latest, current):
    """Compare version tuples. Returns True if latest > current."""
    try:

        def _parse(v):
            return tuple(int(x) for x in v.split("."))

        return _parse(latest) > _parse(current)
    except Exception:
        return False
