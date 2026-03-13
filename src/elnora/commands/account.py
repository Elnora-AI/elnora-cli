"""Account commands — manage user profile and agreements."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import ValidationError, handle_errors, output_success
from ..lib.validation import validate_int


@click.group()
def account():
    """Manage user account and agreements."""


@account.command("get")
@click.argument("user_id")
@click.pass_context
def get_account(ctx, user_id):
    """Get account details by user ID."""
    with handle_errors(ctx):
        uid = validate_int(user_id, "user_id")
        client = ElnoraClient.from_env()
        result = client.get_account(uid)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("update")
@click.argument("user_id")
@click.option("--first-name", default=None, help="New first name.")
@click.option("--last-name", default=None, help="New last name.")
@click.pass_context
def update_account(ctx, user_id, first_name, last_name):
    """Update account first and/or last name."""
    with handle_errors(ctx):
        uid = validate_int(user_id, "user_id")
        if first_name is None and last_name is None:
            raise ValidationError(
                "Nothing to update. Provide --first-name and/or --last-name.",
                suggestion="elnora account update <user_id> --first-name Jane --last-name Doe",
            )
        client = ElnoraClient.from_env()
        result = client.update_account(uid, first_name=first_name, last_name=last_name)
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
@click.option("--document-version-id", required=True, type=int, help="Document version ID to accept (integer).")
@click.pass_context
def accept_terms(ctx, document_version_id):
    """Accept a terms/agreement document version."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.accept_agreement(document_version_id=document_version_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("delete")
@click.option("--yes", is_flag=True, help="Skip confirmation prompt.")
@click.pass_context
def delete_account(ctx, yes):
    """Delete your account.

    WARNING: This permanently deletes your account and all associated data.
    This action is irreversible. You will be asked to type DELETE to confirm.
    """
    with handle_errors(ctx):
        if not yes:
            click.echo("You are about to permanently delete your account.", err=True)
            click.echo("This action is IRREVERSIBLE. All your data will be lost.", err=True)
            confirmation = click.prompt("Type DELETE to confirm", default="", show_default=False)
            if confirmation != "DELETE":
                click.echo('{"aborted": true, "suggestion": "Type exactly: DELETE"}', err=True)
                ctx.exit(0)
        client = ElnoraClient.from_env()
        client.delete_account()
        output_success(
            {"deleted": True, "account": "current user"},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@account.command("users")
@click.option(
    "--state",
    default=None,
    type=click.Choice(["Active", "Pending", "Deleted"]),
    help="Filter by user state.",
)
@click.option("--ref-code", default=None, help="Filter by referral code.")
@click.pass_context
def list_users(ctx, state, ref_code):
    """List all users on the platform (SystemAdmin only)."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.list_users(state=state, ref_code=ref_code)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("add-legal-doc")
@click.option("--document-type", required=True, help="Document type (e.g. TermsOfService, PrivacyPolicy).")
@click.option("--version", "doc_version", required=True, help="Version string (e.g. 1.0, 2.0).")
@click.option("--content", required=True, help="Document content (text or markdown).")
@click.option("--effective-date", default=None, help="Effective date (ISO 8601, e.g. 2026-04-01).")
@click.pass_context
def add_legal_doc(ctx, document_type, doc_version, content, effective_date):
    """Add a new legal document version (SystemAdmin only)."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.add_legal_doc_version(
            document_type=document_type, version=doc_version, content=content, effective_date=effective_date
        )
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("update-legal-doc")
@click.argument("version_id", type=int)
@click.option("--content", default=None, help="Updated document content.")
@click.option("--effective-date", default=None, help="Updated effective date (ISO 8601).")
@click.pass_context
def update_legal_doc(ctx, version_id, content, effective_date):
    """Update a legal document version (SystemAdmin only)."""
    with handle_errors(ctx):
        if content is None and effective_date is None:
            raise ValidationError(
                "Nothing to update. Provide --content and/or --effective-date.",
                suggestion="elnora account update-legal-doc <id> --content '...'",
            )
        client = ElnoraClient.from_env()
        result = client.update_legal_doc_version(version_id, content=content, effective_date=effective_date)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@account.command("delete-legal-doc")
@click.argument("version_id", type=int)
@click.option("--yes", is_flag=True, help="Skip confirmation prompt.")
@click.pass_context
def delete_legal_doc(ctx, version_id, yes):
    """Delete a legal document version (SystemAdmin only).

    WARNING: This permanently removes the legal document version.
    This action is irreversible.
    """
    with handle_errors(ctx):
        if not yes:
            click.echo(f"You are about to permanently delete legal document version {version_id}.", err=True)
            click.echo("This action is IRREVERSIBLE.", err=True)
            confirmation = click.prompt("Type DELETE to confirm", default="", show_default=False)
            if confirmation != "DELETE":
                click.echo('{"aborted": true, "suggestion": "Type exactly: DELETE"}', err=True)
                ctx.exit(0)
        client = ElnoraClient.from_env()
        client.delete_legal_doc_version(version_id)
        output_success(
            {"deleted": True, "documentVersionId": version_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
