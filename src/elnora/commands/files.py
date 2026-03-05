"""Files commands — list, inspect, and read project files."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import handle_errors, output_success
from ..lib.validation import validate_guid, validate_page_size


@click.group()
def files():
    """Manage project files."""


@files.command("list")
@click.option("--project", required=True, help="Project ID (GUID).")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def list_files(ctx, project, page, page_size):
    """List files in a project."""
    with handle_errors(ctx):
        validate_page_size(page_size)
        validate_guid(project, "project")
        client = ElnoraClient.from_env()
        result = client.list_files(project, page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@files.command("get")
@click.argument("file_id")
@click.pass_context
def get_file(ctx, file_id):
    """Get file metadata by ID."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        result = client.get_file(file_id)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@files.command("content")
@click.argument("file_id")
@click.pass_context
def get_content(ctx, file_id):
    """Get raw file content."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        content = client.get_file_content(file_id)
        click.echo(content)


@files.command("versions")
@click.argument("file_id")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def get_versions(ctx, file_id, page, page_size):
    """Get version history for a file."""
    with handle_errors(ctx):
        validate_page_size(page_size)
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        result = client.get_file_versions(file_id, page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
