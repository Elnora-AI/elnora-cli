"""Health check command — verify platform availability (public, no auth required)."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

import click

from ..lib.errors import handle_errors


@click.command()
@click.pass_context
def health(ctx):
    """Check if the Elnora platform is reachable."""
    with handle_errors(ctx):
        url = "https://platform.elnora.ai/health"
        req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                body = resp.read().decode("utf-8")
                try:
                    data = json.loads(body)
                except json.JSONDecodeError:
                    data = {"status": body.strip()}
                data["httpStatus"] = status
                print(json.dumps(data, indent=2))
        except urllib.error.HTTPError as e:
            print(
                json.dumps({"status": "unhealthy", "httpStatus": e.code}, indent=2),
                file=sys.stderr,
            )
            sys.exit(6)
        except urllib.error.URLError as e:
            print(
                json.dumps({"status": "unreachable", "error": str(e.reason)}, indent=2),
                file=sys.stderr,
            )
            sys.exit(6)
