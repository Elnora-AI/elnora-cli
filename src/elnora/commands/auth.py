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
@click.option("--profile", "profile_name", default=None, help="Profile name to save key under (default: 'default').")
@click.pass_context
def login(ctx, api_key, profile_name):
    """Set up authentication.

    Saves your API key to ~/.elnora/profiles.toml.
    Get a key from platform.elnora.ai > Settings > API Keys.

    \b
    Use --profile to save keys for different organizations:
      elnora auth login --profile university
      elnora auth login --profile work
    """
    with handle_errors(ctx):
        from ..lib.profiles import save_profile, validate_profile_name

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

        # Determine effective profile name
        effective = profile_name or ctx.obj.get("profile") or "default"
        validate_profile_name(effective)

        # Verify the key works
        client = ElnoraClient(api_key)
        result = client.list_projects(page=1, page_size=1)

        config_path = save_profile(effective, api_key)
        output_success(
            {
                "authenticated": True,
                "profile": effective,
                "configPath": str(config_path),
                "totalProjects": result.get("totalCount", 0),
            },
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
        if not ctx.obj["compact"]:
            click.echo(f"\nAPI key saved to {config_path} (profile: {effective})", err=True)
            click.echo("You're ready to go! Try: elnora projects list", err=True)


@auth.command()
@click.option("--profile", "profile_name", default=None, help="Profile to check (default: 'default').")
@click.pass_context
def status(ctx, profile_name):
    """Verify API key and show connection info."""
    with handle_errors(ctx):
        effective = profile_name or ctx.obj.get("profile") or "default"
        client = ElnoraClient.from_env(profile=effective)
        result = client.list_projects(page=1, page_size=1)
        output_success(
            {"authenticated": True, "profile": effective, "totalProjects": result.get("totalCount", 0)},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@auth.command()
@click.option("--profile", "profile_name", default=None, help="Profile to remove (default: 'default').")
@click.option("--all", "remove_all", is_flag=True, help="Remove all profiles and delete profiles.toml.")
@click.pass_context
def logout(ctx, profile_name, remove_all):
    """Remove saved credentials."""
    with handle_errors(ctx):
        from ..lib.profiles import PROFILES_FILE, remove_profile

        if remove_all:
            if PROFILES_FILE.is_file():
                PROFILES_FILE.unlink()
                output_success(
                    {"loggedOut": True, "removed": str(PROFILES_FILE), "message": "All profiles removed."},
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
            return

        effective = profile_name or ctx.obj.get("profile") or "default"
        removed = remove_profile(effective)
        if removed:
            output_success(
                {"loggedOut": True, "profile": effective, "message": f"Profile '{effective}' removed."},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )
        else:
            output_success(
                {"loggedOut": True, "profile": effective, "message": f"Profile '{effective}' not found."},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )


@auth.command(name="profiles")
@click.pass_context
def list_profiles(ctx):
    """List all configured profiles."""
    with handle_errors(ctx):
        from ..lib.profiles import load_profiles

        profiles = load_profiles()
        if not profiles:
            output_success(
                {"profiles": [], "message": "No profiles configured. Run: elnora auth login"},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )
            return

        items = []
        for name, data in profiles.items():
            key = data.get("api_key", "")
            if len(key) > 16:
                masked = key[:12] + "..." + key[-4:]
            else:
                masked = "[invalid]"
            items.append({"name": name, "apiKey": masked})
        output_success(
            {"profiles": items},
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
        from ..lib import config
        from ..lib.client import ElnoraClient, anon_request

        if token is None:
            # Use current API key
            effective = ctx.obj.get("profile") or "default"
            client = ElnoraClient.from_env(profile=effective)
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
