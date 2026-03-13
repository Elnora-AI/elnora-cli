"""Search commands — find tasks, files, and file content by query."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import handle_errors, output_success
from ..lib.validation import validate_guid, validate_page, validate_page_size


@click.group()
def search():
    """Search tasks and files."""


@search.command()
@click.option("--query", required=True, help="Search query string.")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def tasks(ctx, query: str, page: int, page_size: int):
    """Search tasks by query string.

    Use --profile to search in a different organization.
    """
    with handle_errors(ctx):
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.search_tasks(query=query, page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@search.command()
@click.option("--query", required=True, help="Search query string.")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def files(ctx, query: str, page: int, page_size: int):
    """Search files by query string.

    Use --profile to search in a different organization.
    """
    with handle_errors(ctx):
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.search_files(query=query, page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@search.command("all")
@click.option("--query", required=True, help="Search query string.")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def all_(ctx, query: str, page: int, page_size: int):
    """Search all resources by query string.

    Use --profile to search in a different organization.
    """
    with handle_errors(ctx):
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.search_all(query=query, page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@search.command("file-content")
@click.option("--query", "-q", required=True, help="Search query string.")
@click.option("--project", "project_id", default=None, help="Limit to project (UUID).")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def file_content(ctx, query: str, project_id: str | None, page: int, page_size: int):
    """Search inside file contents (full-text search).

    Searches the actual content of files, not just names.
    Optionally filter to a specific project with --project.
    """
    with handle_errors(ctx):
        validate_page(page)
        validate_page_size(page_size)
        if project_id:
            validate_guid(project_id, "project")
        client = ElnoraClient.from_env()
        result = client.search_file_content(query, project_id, page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )
