"""Project commands — list, get, create, update, archive, and member management."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import ValidationError, handle_errors, output_success
from ..lib.validation import validate_guid, validate_page, validate_page_size


@click.group()
def projects():
    """Manage projects."""


@projects.command("list")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def list_projects(ctx, page: int, page_size: int):
    """List all projects.

    Use --profile to list projects in a different organization.
    """
    with handle_errors(ctx):
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.list_projects(page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@projects.command("get")
@click.argument("project_id")
@click.pass_context
def get_project(ctx, project_id: str):
    """Get a project by ID."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        client = ElnoraClient.from_env()
        result = client.get_project(project_id)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@projects.command("create")
@click.option("--name", required=True, help="Project name.")
@click.option("--description", default=None, help="Project description.")
@click.option("--icon", default=None, help="Project icon.")
@click.pass_context
def create_project(ctx, name: str, description: str | None, icon: str | None):
    """Create a new project.

    Use --profile to create the project in a different organization.
    """
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.create_project(name=name, description=description, icon=icon)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@projects.command("update")
@click.argument("project_id")
@click.option("--name", default=None, help="New project name.")
@click.option("--description", default=None, help="New project description.")
@click.option("--icon", default=None, help="New project icon.")
@click.pass_context
def update_project(ctx, project_id: str, name: str | None, description: str | None, icon: str | None):
    """Update a project's name, description, or icon."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        if name is None and description is None and icon is None:
            raise ValidationError(
                "Nothing to update. Provide --name, --description, and/or --icon.",
                suggestion="elnora projects update <id> --name 'New name'",
            )
        client = ElnoraClient.from_env()
        result = client.update_project(project_id, name=name, description=description, icon=icon)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@projects.command("archive")
@click.argument("project_id")
@click.pass_context
def archive_project(ctx, project_id: str):
    """Archive a project."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        client = ElnoraClient.from_env()
        client.archive_project(project_id)
        output_success(
            {"archived": True, "projectId": project_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@projects.command("members")
@click.argument("project_id")
@click.pass_context
def list_members(ctx, project_id: str):
    """List members of a project."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        client = ElnoraClient.from_env()
        result = client.list_project_members(project_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@projects.command("add-member")
@click.argument("project_id")
@click.option("--user-id", required=True, help="User GUID to add.")
@click.option("--role", default="Member", show_default=True, help="Role to assign.")
@click.pass_context
def add_member(ctx, project_id: str, user_id: str, role: str):
    """Add a member to a project."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        validate_guid(user_id, "user_id")
        client = ElnoraClient.from_env()
        result = client.add_project_member(project_id, user_id=user_id, role=role)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@projects.command("update-role")
@click.argument("project_id")
@click.argument("user_id")
@click.option("--role", required=True, help="New role to assign.")
@click.pass_context
def update_role(ctx, project_id: str, user_id: str, role: str):
    """Update a project member's role."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        validate_guid(user_id, "user_id")
        client = ElnoraClient.from_env()
        result = client.update_project_member_role(project_id, user_id, role=role)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@projects.command("remove-member")
@click.argument("project_id")
@click.argument("user_id")
@click.pass_context
def remove_member(ctx, project_id: str, user_id: str):
    """Remove a member from a project."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        validate_guid(user_id, "user_id")
        client = ElnoraClient.from_env()
        client.remove_project_member(project_id, user_id)
        output_success(
            {"removed": True, "projectId": project_id, "userId": user_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@projects.command("leave")
@click.argument("project_id")
@click.pass_context
def leave_project(ctx, project_id: str):
    """Leave a project."""
    with handle_errors(ctx):
        validate_guid(project_id, "project_id")
        client = ElnoraClient.from_env()
        result = client.leave_project(project_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])
