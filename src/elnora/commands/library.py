"""Organization library commands — manage shared library files and folders."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import handle_errors, output_success
from ..lib.validation import validate_guid, validate_page, validate_page_size


@click.group()
def library():
    """Manage organization library files and folders."""


@library.command("files")
@click.option("--org", required=True, help="Organization GUID (required).")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def list_library_files(ctx, org, page, page_size):
    """List files in the organization library."""
    with handle_errors(ctx):
        validate_guid(org, "org")
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.list_library_files(org, page=page, page_size=page_size)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@library.command("folders")
@click.option("--org", required=True, help="Organization GUID (required).")
@click.pass_context
def list_library_folders(ctx, org):
    """List folders in the organization library."""
    with handle_errors(ctx):
        validate_guid(org, "org")
        client = ElnoraClient.from_env()
        result = client.list_library_folders(org)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@library.command("create-folder")
@click.option("--org", required=True, help="Organization GUID (required).")
@click.option("--name", required=True, help="Folder name.")
@click.option("--parent", default=None, help="Parent folder GUID (optional).")
@click.pass_context
def create_library_folder(ctx, org, name, parent):
    """Create a new folder in the organization library."""
    with handle_errors(ctx):
        validate_guid(org, "org")
        if parent:
            validate_guid(parent, "parent")
        client = ElnoraClient.from_env()
        result = client.create_library_folder(org, name=name, parent_id=parent)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@library.command("rename-folder")
@click.option("--org", required=True, help="Organization GUID (required).")
@click.argument("folder_id")
@click.option("--name", required=True, help="New folder name.")
@click.pass_context
def rename_library_folder(ctx, org, folder_id, name):
    """Rename a folder in the organization library."""
    with handle_errors(ctx):
        validate_guid(org, "org")
        validate_guid(folder_id, "folder_id")
        client = ElnoraClient.from_env()
        result = client.rename_library_folder(org, folder_id, name=name)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@library.command("delete-folder")
@click.option("--org", required=True, help="Organization GUID (required).")
@click.argument("folder_id")
@click.pass_context
def delete_library_folder(ctx, org, folder_id):
    """Delete a folder from the organization library."""
    with handle_errors(ctx):
        validate_guid(org, "org")
        validate_guid(folder_id, "folder_id")
        client = ElnoraClient.from_env()
        client.delete_library_folder(org, folder_id)
        output_success(
            {"deleted": True, "folderId": folder_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
