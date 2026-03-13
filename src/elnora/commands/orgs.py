"""Organization commands — manage orgs, members, billing, invitations, and admin operations."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import ValidationError, handle_errors, output_success
from ..lib.validation import validate_guid, validate_page, validate_page_size


@click.group()
def orgs():
    """Manage organizations."""


@orgs.command("list")
@click.pass_context
def list_orgs(ctx):
    """List organizations the current user belongs to."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.list_organizations()
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("get")
@click.argument("org_id")
@click.pass_context
def get_org(ctx, org_id):
    """Get a single organization by ID."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        client = ElnoraClient.from_env()
        result = client.get_organization(org_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("create")
@click.option("--name", required=True, help="Organization name (required).")
@click.option("--description", default=None, help="Organization description.")
@click.pass_context
def create_org(ctx, name, description):
    """Create a new organization."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.create_organization(name=name, description=description)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("update")
@click.argument("org_id")
@click.option("--name", default=None, help="New organization name.")
@click.option("--description", default=None, help="New organization description.")
@click.pass_context
def update_org(ctx, org_id, name, description):
    """Update an organization's name or description."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        if name is None and description is None:
            raise ValidationError(
                "Nothing to update. Provide --name and/or --description.",
                suggestion="elnora orgs update <id> --name 'New name' --description 'New desc'",
            )
        client = ElnoraClient.from_env()
        result = client.update_organization(org_id, name=name, description=description)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("members")
@click.argument("org_id")
@click.pass_context
def list_members(ctx, org_id):
    """List members of an organization."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        client = ElnoraClient.from_env()
        result = client.list_organization_members(org_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("update-role")
@click.argument("org_id")
@click.argument("membership_id")
@click.option("--role", required=True, help="New role for the member (required).")
@click.pass_context
def update_role(ctx, org_id, membership_id, role):
    """Update a member's role within an organization."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        validate_guid(membership_id, "membership_id")
        client = ElnoraClient.from_env()
        result = client.update_organization_member_role(org_id, membership_id, role=role)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("remove-member")
@click.argument("org_id")
@click.argument("membership_id")
@click.pass_context
def remove_member(ctx, org_id, membership_id):
    """Remove a member from an organization."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        validate_guid(membership_id, "membership_id")
        client = ElnoraClient.from_env()
        client.remove_organization_member(org_id, membership_id)
        output_success(
            {"deleted": True, "membershipId": membership_id, "orgId": org_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@orgs.command("billing")
@click.argument("org_id")
@click.pass_context
def get_billing(ctx, org_id):
    """Get billing information for an organization."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        client = ElnoraClient.from_env()
        result = client.get_organization_billing(org_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("set-stripe")
@click.argument("org_id")
@click.option("--customer-id", required=True, help="Stripe customer ID (cus_xxx).")
@click.pass_context
def set_stripe(ctx, org_id, customer_id):
    """Set the Stripe customer ID for an organization (SystemAdmin only)."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        client = ElnoraClient.from_env()
        result = client.update_organization_stripe_customer(org_id, stripe_customer_id=customer_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("invite")
@click.argument("org_id")
@click.option("--email", required=True, help="Email address to invite (required).")
@click.option("--role", default="Member", show_default=True, help="Role for the invitee.")
@click.pass_context
def invite(ctx, org_id, email, role):
    """Send an invitation to join an organization.

    Idempotent: if a pending invitation already exists for this email,
    returns the existing invitation instead of raising an error.
    """
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        client = ElnoraClient.from_env()
        # Check for existing pending invitation to make this idempotent
        existing = client.list_invitations(org_id)
        invitations = existing if isinstance(existing, list) else existing.get("items", existing)
        for inv in invitations:
            if inv.get("email", "").lower() == email.lower() and not inv.get("isExpired", False):
                inv["_note"] = "existing pending invitation returned (idempotent)"
                output_success(inv, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])
                return
        result = client.send_invitation(org_id, email=email, role=role)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("invitations")
@click.argument("org_id")
@click.pass_context
def list_invitations(ctx, org_id):
    """List pending invitations for an organization."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        client = ElnoraClient.from_env()
        result = client.list_invitations(org_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("cancel-invite")
@click.argument("org_id")
@click.argument("invitation_id")
@click.pass_context
def cancel_invite(ctx, org_id, invitation_id):
    """Cancel a pending invitation."""
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        validate_guid(invitation_id, "invitation_id")
        client = ElnoraClient.from_env()
        client.cancel_invitation(org_id, invitation_id)
        output_success(
            {"deleted": True, "invitationId": invitation_id, "orgId": org_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@orgs.command("invitation-info")
@click.argument("token")
@click.pass_context
def invitation_info(ctx, token):
    """Get information about an invitation by its token."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.get_invitation_info(token)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("accept-invite")
@click.argument("token")
@click.pass_context
def accept_invite(ctx, token):
    """Accept an invitation using its token."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.accept_invitation(token)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("files")
@click.option("--org", required=True, help="Organization ID (GUID).")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def org_files(ctx, org, page, page_size):
    """List all files across an organization (admin compliance view)."""
    with handle_errors(ctx):
        validate_guid(org, "org")
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.list_org_files(org, page=page, page_size=page_size)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("set-default")
@click.argument("org_id")
@click.pass_context
def set_default(ctx, org_id):
    """Set an organization as your default.

    Your default organization is used when no --profile is specified.
    """
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        client = ElnoraClient.from_env()
        client.set_default_organization(org_id)
        output_success(
            {"updated": True, "defaultOrgId": org_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@orgs.command("list-all")
@click.pass_context
def list_all_orgs(ctx):
    """List ALL organizations on the platform (SystemAdmin only)."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.list_all_organizations()
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("delete")
@click.argument("org_id")
@click.option("--yes", is_flag=True, help="Skip confirmation prompt.")
@click.pass_context
def delete_org(ctx, org_id, yes):
    """Delete an organization (SystemAdmin only).

    WARNING: This permanently deletes the organization and all its data.
    This action is irreversible. You will be asked to confirm unless --yes is passed.
    """
    with handle_errors(ctx):
        validate_guid(org_id, "org_id")
        if not yes:
            # Show org info before confirming
            client = ElnoraClient.from_env()
            org = client.get_organization(org_id)
            org_name = org.get("name", org_id) if isinstance(org, dict) else org_id
            click.echo(f"You are about to permanently delete organization: {org_name} ({org_id})", err=True)
            click.echo("This action is IRREVERSIBLE. All org data will be lost.", err=True)
            confirmation = click.prompt("Type the organization name to confirm", default="", show_default=False)
            if confirmation != org_name:
                click.echo(f'{{"aborted": true, "suggestion": "Type exactly: {org_name}"}}', err=True)
                ctx.exit(0)
        else:
            client = ElnoraClient.from_env()
        client.delete_organization(org_id)
        output_success(
            {"deleted": True, "orgId": org_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
