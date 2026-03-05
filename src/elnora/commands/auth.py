"""Auth commands — login, verify API key, and show connection info."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import AuthError, handle_errors, output_success


@click.group()
def auth():
    """Manage authentication."""


@auth.command()
@click.option("--api-key", default=None, help="API key (prompted interactively if omitted).")
@click.pass_context
def login(ctx, api_key):
    """Set up authentication.

    Saves your API key to ~/.elnora/config.toml.
    Get a key from platform.elnora.ai > Settings > API Keys.
    """
    with handle_errors(ctx):
        if api_key:
            click.echo(
                "Warning: passing --api-key on the command line is insecure (visible in process listings). "
                "Use interactive prompt or pipe via stdin instead.",
                err=True,
            )
        else:
            click.echo("Get your API key from: https://platform.elnora.ai > Settings > API Keys")
            api_key = click.prompt("API key", hide_input=True)

        api_key = api_key.strip()
        if not api_key.startswith("elnora_live_"):
            raise AuthError("API key must start with 'elnora_live_'.")
        if len(api_key) < 20:
            raise AuthError("API key looks too short. Check your key and try again.")

        # Verify the key works
        client = ElnoraClient(api_key)
        result = client.list_projects(page=1, page_size=1)

        config_path = ElnoraClient.save_config(api_key)
        output_success(
            {
                "authenticated": True,
                "configPath": str(config_path),
                "totalProjects": result.get("totalCount", 0),
            },
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
        if not ctx.obj["compact"]:
            click.echo(f"\nAPI key saved to {config_path}", err=True)
            click.echo("You're ready to go! Try: elnora projects list", err=True)


@auth.command()
@click.pass_context
def status(ctx):
    """Verify API key and show connection info."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.list_projects(page=1, page_size=1)
        output_success(
            {"authenticated": True, "totalProjects": result.get("totalCount", 0)},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@auth.command()
@click.pass_context
def logout(ctx):
    """Remove saved API key from ~/.elnora/config.toml."""
    from ..lib.client import CONFIG_FILE

    with handle_errors(ctx):
        if CONFIG_FILE.is_file():
            CONFIG_FILE.unlink()
            output_success(
                {"loggedOut": True, "removed": str(CONFIG_FILE)},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )
        else:
            output_success(
                {"loggedOut": True, "message": "No saved credentials found."},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )


@auth.command()
@click.option("--token", default=None, help="Token to validate (defaults to current API key).")
@click.pass_context
def validate(ctx, token):
    """Validate a JWT or API key token."""
    with handle_errors(ctx):
        from ..lib.client import ElnoraClient, anon_request
        from ..lib import config

        if token is None:
            # Use current API key
            client = ElnoraClient.from_env()
            token = client._api_key
        result = anon_request(
            config.ENDPOINTS["auth_validate"],
            {"token": token},
            method="POST",
        )
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
