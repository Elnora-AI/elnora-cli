"""API key commands — create, list, and revoke API keys."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import handle_errors, output_success


@click.group("api-keys")
def api_keys():
    """Manage API keys."""


@api_keys.command("create")
@click.option("--name", required=True, help="Name for the API key.")
@click.option("--scopes", default=None, help="Comma-separated list of scopes.")
@click.pass_context
def create_api_key(ctx, name, scopes):
    """Create a new API key."""
    with handle_errors(ctx):
        scopes_list = None
        if scopes:
            scopes_list = [s.strip() for s in scopes.split(",") if s.strip()]
        client = ElnoraClient.from_env()
        result = client.create_api_key(name=name, scopes=scopes_list)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@api_keys.command("list")
@click.pass_context
def list_api_keys(ctx):
    """List all API keys."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.list_api_keys()
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@api_keys.command("revoke")
@click.argument("key_id")
@click.pass_context
def revoke_api_key(ctx, key_id):
    """Revoke an API key."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        client.revoke_api_key(key_id)
        output_success(
            {"revoked": True, "keyId": key_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
