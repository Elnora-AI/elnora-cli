"""Project commands — list, get, and create projects."""
from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import handle_errors, output_success
from ..lib.validation import validate_guid, validate_page_size


@click.group()
def projects():
    """Manage projects."""


@projects.command("list")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def list_projects(ctx, page: int, page_size: int):
    """List all projects."""
    with handle_errors(ctx):
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
    """Create a new project."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.create_project(name=name, description=description, icon=icon)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
