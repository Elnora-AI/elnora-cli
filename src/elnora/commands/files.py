"""Files commands — list, inspect, read, create, upload, update, archive, and version management."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.config import DEFAULT_PAGE_SIZE
from ..lib.errors import ValidationError, handle_errors, output_success
from ..lib.validation import validate_guid, validate_page, validate_page_size


@click.group()
def files():
    """Manage project files."""


@files.command("list")
@click.option("--project", required=True, help="Project ID (GUID).")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def list_files(ctx, project, page, page_size):
    """List files in a project.

    Use --profile to list files in a different organization.
    """
    with handle_errors(ctx):
        validate_guid(project, "project")
        validate_page(page)
        validate_page_size(page_size)
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
    """Get raw file content.

    Outputs raw text by default. Use --output json to wrap in {"content": "..."}.
    """
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        content = client.get_file_content(file_id)
        if ctx.obj["compact"] or ctx.obj["fields"]:
            # Structured output when explicitly requested
            output_success(
                {"content": content},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )
        else:
            # Raw text output (default) — CSV and plain JSON both get raw text
            click.echo(content)


@files.command("versions")
@click.argument("file_id")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def get_versions(ctx, file_id, page, page_size):
    """Get version history for a file."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        validate_page(page)
        validate_page_size(page_size)
        client = ElnoraClient.from_env()
        result = client.get_file_versions(file_id, page=page, page_size=page_size)
        output_success(
            result,
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@files.command("create")
@click.option("--project", required=True, help="Project GUID (required).")
@click.option("--name", required=True, help="File name.")
@click.option("--folder", default=None, help="Folder GUID (optional).")
@click.option("--type", "type_", required=True, help="File type (e.g. Document, Protocol, Dataset).")
@click.pass_context
def create_file(ctx, project: str, name: str, folder: str | None, type_: str | None):
    """Create a new file in a project.

    Use --profile to create the file in a different organization.
    """
    with handle_errors(ctx):
        validate_guid(project, "project")
        if folder:
            validate_guid(folder, "folder")
        client = ElnoraClient.from_env()
        result = client.create_file(project_id=project, name=name, folder_id=folder, file_type=type_)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("upload")
@click.option("--project", required=True, help="Project GUID (required).")
@click.option("--file", "file_path", required=True, type=click.Path(exists=True), help="Local file path to upload.")
@click.option("--file-name", default=None, help="Override file name (defaults to local filename).")
@click.option("--content-type", default=None, help="MIME content type (auto-detected if omitted).")
@click.pass_context
def upload_file(ctx, project: str, file_path: str, file_name: str | None, content_type: str | None):
    """Upload a local file to a project.

    Gets a presigned URL from the API, uploads the file, and confirms.
    """
    import mimetypes
    from pathlib import Path

    with handle_errors(ctx):
        validate_guid(project, "project")
        path = Path(file_path)
        if file_name is None:
            file_name = path.name
        if content_type is None:
            content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
        file_size = path.stat().st_size
        if file_size == 0:
            raise ValidationError("File is empty.", suggestion="Provide a non-empty file.")

        client = ElnoraClient.from_env()
        # Step 1: Get presigned upload URL
        upload_info = client.initiate_upload(
            project_id=project,
            file_name=file_name,
            content_type=content_type,
            file_size_bytes=file_size,
        )

        # Step 2: PUT file content to presigned URL
        presigned_url = upload_info.get("uploadUrl") or upload_info.get("url")
        file_id = upload_info.get("fileId") or upload_info.get("id")
        if not presigned_url:
            raise ValidationError(
                "API did not return an upload URL.",
                suggestion="Check API response: " + str(list(upload_info.keys())),
            )

        import urllib.parse
        import urllib.request

        from ..lib.client import _NoRedirectHandler, validate_upload_url

        validate_upload_url(presigned_url)

        upload_opener = urllib.request.build_opener(_NoRedirectHandler)
        with path.open("rb") as fh:
            put_req = urllib.request.Request(
                presigned_url,
                data=fh,
                headers={"Content-Type": content_type, "Content-Length": str(file_size)},
                method="PUT",
            )
            with upload_opener.open(put_req, timeout=120) as resp:
                resp.read()

        # Step 3: Confirm upload
        if file_id:
            confirm_result = client.confirm_upload(file_id)
            output_success(confirm_result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])
        else:
            output_success(upload_info, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("upload-batch")
@click.option("--project", required=True, help="Project GUID (required).")
@click.option("--files", "file_paths", required=True, help="Comma-separated local file paths to upload.")
@click.option("--folder", default=None, help="Folder GUID (optional, applies to all files).")
@click.pass_context
def upload_batch(ctx, project: str, file_paths: str, folder: str | None):
    """Upload multiple local files to a project in a single batch.

    Gets presigned URLs for up to 50 files, uploads them in sequence, and confirms each.

    \b
    Example:
      elnora files upload-batch --project <ID> --files "a.pdf,b.docx,c.txt"
    """
    import mimetypes
    from pathlib import Path

    with handle_errors(ctx):
        validate_guid(project, "project")
        if folder:
            validate_guid(folder, "folder")
        paths = [Path(p.strip()) for p in file_paths.split(",") if p.strip()]
        if not paths:
            raise ValidationError("No files specified.", suggestion="Provide comma-separated file paths with --files.")
        if len(paths) > 50:
            raise ValidationError(
                f"Too many files ({len(paths)}). Maximum is 50 per batch.",
                suggestion="Split into multiple batches of 50 or fewer.",
            )
        for p in paths:
            if not p.exists():
                raise ValidationError(f"File not found: {p}")
            if p.stat().st_size == 0:
                raise ValidationError(f"File is empty: {p}", suggestion="Provide non-empty files.")

        # Build batch request items
        items = []
        for p in paths:
            ct = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
            item = {
                "fileName": p.name,
                "contentType": ct,
                "fileSizeBytes": p.stat().st_size,
                "projectId": project,
            }
            if folder:
                item["folderId"] = folder
            items.append(item)

        client = ElnoraClient.from_env()
        batch_result = client.batch_initiate_upload(items=items)

        # Upload each file to its presigned URL and confirm
        import urllib.parse
        import urllib.request

        from ..lib.client import _NoRedirectHandler

        upload_opener = urllib.request.build_opener(_NoRedirectHandler)
        result_items = batch_result if isinstance(batch_result, list) else batch_result.get("items", [])
        results = []
        for i, entry in enumerate(result_items):
            if i >= len(paths):
                results.append(
                    {
                        "file": "unknown",
                        "status": "failed",
                        "error": "API returned more items than files sent",
                    }
                )
                break
            if entry.get("status") == "failed":
                results.append({"file": paths[i].name, "status": "failed", "error": entry.get("error", "unknown")})
                continue
            data = entry.get("data", entry)
            presigned_url = data.get("uploadUrl") or data.get("url")
            file_id = data.get("fileId") or data.get("id")
            if not presigned_url or not file_id:
                results.append({"file": paths[i].name, "status": "failed", "error": "no upload URL returned"})
                continue
            from ..lib.client import validate_upload_url

            try:
                validate_upload_url(presigned_url)
            except Exception as url_exc:
                results.append({"file": paths[i].name, "status": "failed", "error": str(url_exc)})
                continue
            try:
                ct = mimetypes.guess_type(paths[i].name)[0] or "application/octet-stream"
                fsize = str(paths[i].stat().st_size)
                with paths[i].open("rb") as fh:
                    put_req = urllib.request.Request(
                        presigned_url,
                        data=fh,
                        headers={"Content-Type": ct, "Content-Length": fsize},
                        method="PUT",
                    )
                    with upload_opener.open(put_req, timeout=120) as resp:
                        resp.read()
                confirm = client.confirm_upload(file_id)
                results.append({"file": paths[i].name, "status": "success", "fileId": file_id, "detail": confirm})
            except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
                err_type = type(exc).__name__
                results.append({"file": paths[i].name, "status": "failed", "error": f"Upload failed: {err_type}"})

        output_success(results, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("confirm-upload")
@click.argument("file_id")
@click.pass_context
def confirm_upload(ctx, file_id: str):
    """Confirm a file upload has completed."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        result = client.confirm_upload(file_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("download")
@click.argument("file_id")
@click.pass_context
def download_file(ctx, file_id: str):
    """Download raw file content."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        content = client.download_file(file_id)
        if ctx.obj["compact"] or ctx.obj["fields"]:
            output_success(
                {"content": content},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )
        else:
            click.echo(content)


@files.command("update")
@click.argument("file_id")
@click.option("--name", default=None, help="New file name.")
@click.option("--folder", default=None, help="New folder GUID.")
@click.pass_context
def update_file(ctx, file_id: str, name: str | None, folder: str | None):
    """Update a file's name or folder."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        if name is None and folder is None:
            raise ValidationError(
                "Nothing to update. Provide --name and/or --folder.",
                suggestion="elnora files update <id> --name 'New name'",
            )
        if folder:
            validate_guid(folder, "folder")
        client = ElnoraClient.from_env()
        result = client.update_file(file_id, name=name, folder_id=folder)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("archive")
@click.argument("file_id")
@click.pass_context
def archive_file(ctx, file_id: str):
    """Archive a file."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        client.archive_file(file_id)
        output_success(
            {"archived": True, "fileId": file_id},
            compact=ctx.obj["compact"],
            fmt=ctx.obj["fmt"],
            fields=ctx.obj["fields"],
        )


@files.command("version-content")
@click.argument("file_id")
@click.argument("version_id")
@click.pass_context
def version_content(ctx, file_id: str, version_id: str):
    """Get content of a specific file version."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        validate_guid(version_id, "version_id")
        client = ElnoraClient.from_env()
        content = client.get_file_version_content(file_id, version_id)
        if ctx.obj["compact"] or ctx.obj["fields"]:
            output_success(
                {"content": content},
                compact=ctx.obj["compact"],
                fmt=ctx.obj["fmt"],
                fields=ctx.obj["fields"],
            )
        else:
            click.echo(content)


@files.command("create-version")
@click.argument("file_id")
@click.option("--content", default=None, help="Version content (optional).")
@click.pass_context
def create_version(ctx, file_id: str, content: str | None):
    """Create a new version of a file."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        result = client.create_file_version(file_id, content=content)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("restore")
@click.argument("file_id")
@click.argument("version_id")
@click.pass_context
def restore_version(ctx, file_id: str, version_id: str):
    """Restore a file to a specific version."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        validate_guid(version_id, "version_id")
        client = ElnoraClient.from_env()
        result = client.restore_file_version(file_id, version_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("promote")
@click.argument("file_id")
@click.option("--visibility", required=True, help="Visibility level to promote to.")
@click.pass_context
def promote_file(ctx, file_id: str, visibility: str):
    """Promote a file's visibility."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        result = client.promote_file(file_id, visibility=visibility)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("fork")
@click.argument("file_id")
@click.option("--target-project", required=True, help="Target project GUID.")
@click.pass_context
def fork_file(ctx, file_id: str, target_project: str):
    """Fork a file into another project."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        validate_guid(target_project, "target_project")
        client = ElnoraClient.from_env()
        result = client.fork_file(file_id, target_project_id=target_project)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("working-copy")
@click.argument("file_id")
@click.option("--task", default=None, help="Task GUID (optional).")
@click.pass_context
def working_copy(ctx, file_id: str, task: str | None):
    """Create a working copy of a file."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        if task:
            validate_guid(task, "task")
        client = ElnoraClient.from_env()
        result = client.create_working_copy(file_id, task_id=task)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("commit")
@click.argument("file_id")
@click.pass_context
def commit_working_copy(ctx, file_id: str):
    """Commit a working copy."""
    with handle_errors(ctx):
        validate_guid(file_id, "file_id")
        client = ElnoraClient.from_env()
        result = client.commit_working_copy(file_id)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])


@files.command("search-content")
@click.option("--project", "project_id", default=None, help="Limit to project (UUID).")
@click.option("--query", "-q", required=True, help="Search query.")
@click.option("--page", default=1, type=int, show_default=True, help="Page number.")
@click.option("--page-size", default=DEFAULT_PAGE_SIZE, type=int, show_default=True, help="Results per page.")
@click.pass_context
def search_file_content(ctx, project_id, query, page, page_size):
    """Search inside file contents."""
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
