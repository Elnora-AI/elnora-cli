"""Account commands — manage user profile and agreements."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import ValidationError, handle_errors, output_success


@click.group()
def account():
    """Manage user account and agreements."""


@account.command("get")
@click.argument("user_id")
@click.pass_context
def get_account(ctx, user_id):
    """Get account details by user ID."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.get_account(int(user_id))
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("update")
@click.argument("user_id")
@click.option("--first-name", default=None, help="New first name.")
@click.option("--last-name", default=None, help="New last name.")
@click.pass_context
def update_account(ctx, user_id, first_name, last_name):
    """Update account first and/or last name."""
    with handle_errors(ctx):
        if first_name is None and last_name is None:
            raise ValidationError(
                "Nothing to update. Provide --first-name and/or --last-name.",
                suggestion="elnora account update <user_id> --first-name Jane --last-name Doe",
            )
        client = ElnoraClient.from_env()
        result = client.update_account(int(user_id), first_name=first_name, last_name=last_name)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("agreements")
@click.pass_context
def list_agreements(ctx):
    """List all agreements."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.list_agreements()
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("accept-terms")
@click.option("--document-version-id", required=True, help="Document version ID to accept (integer).")
@click.pass_context
def accept_terms(ctx, document_version_id):
    """Accept a terms/agreement document version."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.accept_agreement(document_version_id=int(document_version_id))
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])
