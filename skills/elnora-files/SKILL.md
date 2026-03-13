---
name: elnora-files
description: >
  This skill should be used when the user asks to "list files", "read a file",
  "get file content", "view protocol output", "file versions", "version history",
  "download protocol", "upload file", "upload batch", "bulk upload", "create file",
  "archive file", "fork file", "promote file", "working copy", "restore version",
  "search file content", or any task involving Elnora Platform file management.
---

# Elnora Files

Browse, read, create, upload, version, and manage files on the Elnora AI Platform. Files are protocol outputs, templates, datasets, and other artifacts attached to projects.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

## Commands

### List Files

```bash
$CLI --compact files list --project <PROJECT_ID>
$CLI --compact files list --project <PROJECT_ID> --page 2 --page-size 50
$CLI --compact --fields "id,name" files list --project <PROJECT_ID>
```

`--project` is required. Response:

```json
{"items":[{"id":"<UUID>","name":"...","mimeType":"...","size":N,"createdAt":"...","updatedAt":"..."}],"page":1,"totalCount":N,"hasNextPage":false}
```

### Get File Metadata

```bash
$CLI --compact files get <FILE_ID>
```

Returns metadata (name, type, size, timestamps) without the actual content. Use to inspect a file before reading.

### Get File Content

```bash
$CLI files content <FILE_ID>
```

Returns raw file content to stdout (not JSON-wrapped). Pipe to a file to save:

```bash
$CLI files content <FILE_ID> > protocol.md
```

Note: `--compact` or `--fields` wraps output in `{"content":"..."}` JSON. Omit both to get raw text output. Same applies to `download` and `version-content`.

### Download File

```bash
$CLI files download <FILE_ID>
```

Downloads raw file content. Same behavior as `content` — raw output to stdout.

### Get Version History

```bash
$CLI --compact files versions <FILE_ID>
$CLI --compact files versions <FILE_ID> --page-size 10
```

Returns paginated list of file versions. Use to track how a protocol evolved across task iterations.

### Get Version Content

```bash
$CLI files version-content <FILE_ID> <VERSION_ID>
```

Returns the content of a specific file version. Raw output to stdout by default.

### Create Version

```bash
$CLI --compact files create-version <FILE_ID>
$CLI --compact files create-version <FILE_ID> --content "Updated protocol text"
```

Creates a new version of a file. `--content` is optional.

### Restore Version

```bash
$CLI --compact files restore <FILE_ID> <VERSION_ID>
```

Restores a file to a specific previous version. Destructive — confirm with user first.

### Create File

```bash
$CLI --compact files create --project <PROJECT_ID> --name "protocol.md" --type Document
$CLI --compact files create --project <PROJECT_ID> --name "data.csv" --type Dataset --folder <FOLDER_ID>
```

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--name` | Yes | File name |
| `--type` | Yes | File type (e.g. Document, Protocol, Dataset) |
| `--folder` | No | Folder UUID to place the file in |

### Upload File

**Limits:** Max 100 MB per file, filename max 255 chars, any MIME type accepted. Presigned URL expires in 15 minutes.

```bash
$CLI --compact files upload --project <PROJECT_ID> --file /path/to/local/file.md
$CLI --compact files upload --project <PROJECT_ID> --file /path/to/data.csv --file-name "renamed.csv" --content-type "text/csv"
```

Three-step process (handled automatically): gets presigned URL, uploads content, confirms upload.

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--file` | Yes | Local file path |
| `--file-name` | No | Override filename (defaults to local name) |
| `--content-type` | No | MIME type (auto-detected if omitted) |

### Upload Batch

```bash
$CLI --compact files upload-batch --project <PROJECT_ID> --files "a.pdf,b.docx,c.txt"
$CLI --compact files upload-batch --project <PROJECT_ID> --files "file1.md,file2.md" --folder <FOLDER_ID>
```

Uploads up to 50 files in a single batch. Gets presigned URLs in bulk, uploads each file, and confirms all.

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--files` | Yes | Comma-separated local file paths |
| `--folder` | No | Folder UUID (applies to all files) |

Returns a list of results per file with status (success/failed).

### Confirm Upload

```bash
$CLI --compact files confirm-upload <FILE_ID>
```

Manually confirms a file upload. Only needed if the `upload` command was interrupted after the PUT step.

### Update File

```bash
$CLI --compact files update <FILE_ID> --name "new-name.md"
$CLI --compact files update <FILE_ID> --folder <FOLDER_ID>
```

Must provide at least one of `--name` or `--folder`.

### Archive File

```bash
$CLI --compact files archive <FILE_ID>
# -> {"archived":true,"fileId":"<UUID>"}
```

Destructive — confirm with user before running.

### Promote File

```bash
$CLI --compact files promote <FILE_ID> --visibility <LEVEL>
```

Promotes a file's visibility level. `--visibility` is required.

### Fork File

```bash
$CLI --compact files fork <FILE_ID> --target-project <PROJECT_ID>
```

Copies a file into another project. `--target-project` is required.

### Working Copy

```bash
$CLI --compact files working-copy <FILE_ID>
$CLI --compact files working-copy <FILE_ID> --task <TASK_ID>
```

Creates a working copy of a file, optionally linked to a task.

### Commit Working Copy

```bash
$CLI --compact files commit <FILE_ID>
```

Commits a working copy back as a new version.

### Search File Content

```bash
$CLI --compact files search-content -q "annealing temperature"
$CLI --compact files search-content -q "BRCA1" --project <PROJECT_ID>
$CLI --compact files search-content -q "gel electrophoresis" --page-size 10
```

Full-text search inside file contents. Optional `--project` to limit to a specific project. Same command is also available as `search file-content`.

| Flag | Required | Notes |
|------|----------|-------|
| `--query` / `-q` | Yes | Search query string |
| `--project` | No | Project UUID to filter by |
| `--page` | No | Page number (default 1) |
| `--page-size` | No | Results per page (default 25, max 100) |

## Agent Recipes

**Read a protocol from a project:**

```bash
# 1. List files in the project
$CLI --compact --fields "id,name" files list --project <PROJECT_ID>

# 2. Read the content of the target file
$CLI files content <FILE_ID>
```

**Compare file versions:**

```bash
# Get version history
$CLI --compact files versions <FILE_ID>

# Read specific version content
$CLI files version-content <FILE_ID> <VERSION_ID>
```

**Upload a local file to a project:**

```bash
$CLI --compact files upload --project <PROJECT_ID> --file /path/to/protocol.md
```

**Fork a protocol to another project:**

```bash
$CLI --compact files fork <FILE_ID> --target-project <TARGET_PROJECT_ID>
```

**Edit-in-place workflow (working copy):**

```bash
# 1. Create working copy
WC=$($CLI --compact files working-copy <FILE_ID> | jq -r '.id')

# 2. ... make edits externally ...

# 3. Commit the working copy
$CLI --compact files commit "$WC"
```

**Reference a file in a task message:**

```bash
# Use file IDs from files list as --file-refs in tasks send
$CLI --compact tasks send <TASK_ID> --message "Optimize this protocol" --file-refs "<FILE_ID>"
```
