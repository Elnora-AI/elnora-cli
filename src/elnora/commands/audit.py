"""Audit commands — view organization audit log."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import handle_errors, output_success
from ..lib.validation import validate_guid, validate_page, validate_page_size


@click.group()
def audit():
    """View audit logs."""


@audit.command("list")
@click.option("--org", required=True, help="Organization GUID (required).")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.option("--action", default=None, help="Filter by action type.")
@click.option("--user-id", default=None, help="Filter by user ID.")
@click.pass_context
def list_audit_log(ctx, org, page, page_size, action, user_id):
    """List audit log entries for an organization."""
    with handle_errors(ctx):
        validate_guid(org, "org")
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.list_audit_log(org, page=page, page_size=page_size, action=action, user_id=user_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])
