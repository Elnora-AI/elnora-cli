"""Organization commands — manage orgs, members, billing, and invitations."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import ValidationError, handle_errors, output_success


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
        client = ElnoraClient.from_env()
        result = client.get_organization_billing(org_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("invite")
@click.argument("org_id")
@click.option("--email", required=True, help="Email address to invite (required).")
@click.option("--role", default="Member", show_default=True, help="Role for the invitee.")
@click.pass_context
def invite(ctx, org_id, email, role):
    """Send an invitation to join an organization."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.send_invitation(org_id, email=email, role=role)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@orgs.command("invitations")
@click.argument("org_id")
@click.pass_context
def list_invitations(ctx, org_id):
    """List pending invitations for an organization."""
    with handle_errors(ctx):
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
