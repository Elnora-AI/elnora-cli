"""Feature flag commands — view global feature flags (public, no auth required)."""

from __future__ import annotations

import click

from ..lib import config
from ..lib.client import anon_request
from ..lib.errors import handle_errors, output_success


@click.group()
def flags():
    """View global feature flags."""


@flags.command("list")
@click.pass_context
def list_flags(ctx):
    """List all global feature flags."""
    with handle_errors(ctx):
        result = anon_request(config.ENDPOINTS["feature_flags"])
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@flags.command()
@click.argument("key")
@click.pass_context
def get(ctx, key: str):
    """Get a single feature flag by key."""
    with handle_errors(ctx):
        result = anon_request(config.ENDPOINTS["feature_flag"].replace("{key}", key))
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
