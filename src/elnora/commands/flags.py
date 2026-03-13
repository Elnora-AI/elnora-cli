"""Feature flag commands — list, get, and set global feature flags (SystemAdmin only)."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import handle_errors, output_success


@click.group()
def flags():
    """Manage global feature flags (SystemAdmin only)."""


@flags.command("list")
@click.pass_context
def list_flags(ctx):
    """List all global feature flags."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.list_feature_flags()
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@flags.command("get")
@click.argument("key")
@click.pass_context
def get_flag(ctx, key):
    """Get the value of a feature flag by key."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.get_feature_flag(key)
        output_success(
            {"key": key, "value": result},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@flags.command("set")
@click.argument("key")
@click.argument("value", type=click.Choice(["true", "false"]))
@click.option("--yes", is_flag=True, help="Skip confirmation prompt.")
@click.pass_context
def set_flag(ctx, key, value, yes):
    """Set a feature flag value.

    WARNING: Changing feature flags affects all users on the platform.
    You will be asked to confirm unless --yes is passed.

    \b
    Example:
      elnora flags set enable-new-editor true
    """
    with handle_errors(ctx):
        bool_value = value == "true"
        if not yes:
            click.echo(
                f"You are about to set feature flag '{key}' to {bool_value} for ALL users.",
                err=True,
            )
            if not click.confirm("Are you sure?", default=False, err=True):
                click.echo('{"aborted": true, "suggestion": "Use --yes to skip confirmation."}', err=True)
                ctx.exit(0)
        client = ElnoraClient.from_env()
        client.set_feature_flag(key, value=bool_value)
        output_success(
            {"updated": True, "key": key, "value": bool_value},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
