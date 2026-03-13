"""Task commands — list, get, create, send, messages, update, archive."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import ValidationError, handle_errors, output_success
from ..lib.validation import validate_guid, validate_page, validate_page_size


@click.group()
def tasks():
    """Manage tasks."""


@tasks.command("list")
@click.option("--project", default=None, help="Project GUID to filter tasks.")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def list_tasks(ctx, project, page, page_size):
    """List tasks, optionally filtered by project.

    Use --profile to list tasks in a different organization.
    """
    with handle_errors(ctx):
        validate_page(page)
        validate_page_size(page_size)
        if project:
            validate_guid(project, "project")
        client = ElnoraClient.from_env()
        if project:
            result = client.list_project_tasks(project, page=page, page_size=page_size)
        else:
            result = client.list_tasks(page=page, page_size=page_size)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@tasks.command("get")
@click.argument("task_id")
@click.pass_context
def get_task(ctx, task_id):
    """Get a single task by ID."""
    with handle_errors(ctx):
        validate_guid(task_id, "task_id")
        client = ElnoraClient.from_env()
        result = client.get_task(task_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@tasks.command("create")
@click.option("--project", required=True, help="Project GUID (required).")
@click.option("--title", default=None, help="Task title.")
@click.option("--message", default=None, help="Initial message content.")
@click.pass_context
def create_task(ctx, project, title, message):
    """Create a new task in a project.

    Use --profile to create the task in a different organization.
    """
    with handle_errors(ctx):
        validate_guid(project, "project")
        client = ElnoraClient.from_env()
        result = client.create_task(project_id=project, title=title, initial_message=message)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@tasks.command("send")
@click.argument("task_id")
@click.option("--message", required=True, help="Message content.")
@click.option("--file-refs", default=None, help="Comma-separated file GUIDs to reference.")
@click.pass_context
def send_message(ctx, task_id, message, file_refs):
    """Send a message to a task."""
    with handle_errors(ctx):
        validate_guid(task_id, "task_id")
        file_refs_list = None
        if file_refs:
            file_refs_list = [ref.strip() for ref in file_refs.split(",") if ref.strip()]
            for ref in file_refs_list:
                validate_guid(ref, "file_ref")
        client = ElnoraClient.from_env()
        result = client.send_message(task_id, content=message, referenced_file_ids=file_refs_list)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@tasks.command("messages")
@click.argument("task_id")
@click.option("--cursor", default=None, help="Pagination cursor.")
@click.option("--limit", default=50, type=int, show_default=True, help="Max messages to return.")
@click.pass_context
def get_messages(ctx, task_id, cursor, limit):
    """Get messages for a task (cursor-based pagination)."""
    with handle_errors(ctx):
        validate_guid(task_id, "task_id")
        validate_page_size(limit, "limit")
        client = ElnoraClient.from_env()
        result = client.get_messages(task_id, cursor=cursor, limit=limit)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@tasks.command("update")
@click.argument("task_id")
@click.option("--title", default=None, help="New task title.")
@click.option("--status", default=None, help="New task status (e.g. active, completed).")
@click.pass_context
def update_task(ctx, task_id, title, status):
    """Update a task's title or status."""
    with handle_errors(ctx):
        validate_guid(task_id, "task_id")
        if title is None and status is None:
            raise ValidationError(
                "Nothing to update. Provide --title and/or --status.",
                suggestion="elnora tasks update <id> --title 'New title' --status completed",
            )
        client = ElnoraClient.from_env()
        result = client.update_task(task_id, title=title, status=status)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@tasks.command("archive")
@click.argument("task_id")
@click.pass_context
def archive_task(ctx, task_id):
    """Delete a task. This action is irreversible."""
    with handle_errors(ctx):
        validate_guid(task_id, "task_id")
        client = ElnoraClient.from_env()
        client.archive_task(task_id)
        output_success(
            {"archived": True, "taskId": task_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
