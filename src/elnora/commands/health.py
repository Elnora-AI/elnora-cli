"""Health check command — verify platform availability (public, no auth required)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

import click

from ..lib.errors import ServerError, handle_errors, output_error, output_success


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
                output_success(data, compact=ctx.obj["compact"], fields=ctx.obj["fields"])
        except urllib.error.HTTPError as e:
            output_error(
                ServerError(f"Elnora platform returned HTTP {e.code}"),
                compact=ctx.obj["compact"],
            )
        except urllib.error.URLError as e:
            output_error(
                ServerError(f"Elnora platform unreachable: {e.reason}"),
                compact=ctx.obj["compact"],
            )
