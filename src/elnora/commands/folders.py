"""Folder commands — manage project folder trees."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import handle_errors, output_success
from ..lib.validation import validate_guid


@click.group()
def folders():
    """Manage project folders."""


@folders.command("list")
@click.option("--project", required=True, help="Project GUID (required).")
@click.pass_context
def list_folders(ctx, project):
    """List folders in a project.

    Use --profile to list folders in a different organization.
    """
    with handle_errors(ctx):
        validate_guid(project, "project")
        client = ElnoraClient.from_env()
        result = client.list_folders(project)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@folders.command("create")
@click.option("--project", required=True, help="Project GUID (required).")
@click.option("--name", required=True, help="Folder name.")
@click.option("--parent", default=None, help="Parent folder GUID (optional).")
@click.pass_context
def create_folder(ctx, project, name, parent):
    """Create a new folder in a project.

    Use --profile to create the folder in a different organization.
    """
    with handle_errors(ctx):
        validate_guid(project, "project")
        if parent:
            validate_guid(parent, "parent")
        client = ElnoraClient.from_env()
        result = client.create_folder(project, name=name, parent_id=parent)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@folders.command("rename")
@click.argument("folder_id")
@click.option("--name", required=True, help="New folder name.")
@click.pass_context
def rename_folder(ctx, folder_id, name):
    """Rename a folder."""
    with handle_errors(ctx):
        validate_guid(folder_id, "folder_id")
        client = ElnoraClient.from_env()
        result = client.rename_folder(folder_id, name=name)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@folders.command("move")
@click.argument("folder_id")
@click.option("--parent", required=True, help="New parent folder GUID, or 'root' to move to project root.")
@click.pass_context
def move_folder(ctx, folder_id, parent):
    """Move a folder to a new parent (or root)."""
    with handle_errors(ctx):
        validate_guid(folder_id, "folder_id")
        if parent != "root":
            validate_guid(parent, "parent")
        client = ElnoraClient.from_env()
        result = client.move_folder(folder_id, parent_id=parent if parent != "root" else None)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@folders.command("delete")
@click.argument("folder_id")
@click.pass_context
def delete_folder(ctx, folder_id):
    """Delete a folder."""
    with handle_errors(ctx):
        validate_guid(folder_id, "folder_id")
        client = ElnoraClient.from_env()
        client.delete_folder(folder_id)
        output_success(
            {"deleted": True, "folderId": folder_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
