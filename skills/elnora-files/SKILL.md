---
name: elnora-files
description: >
  This skill should be used when the user asks to "list files", "read a file",
  "get file content", "view protocol output", "file versions", "version history",
  "download protocol", "upload file", "upload batch", "bulk upload", "create file",
  "archive file", "fork file", "promote file", "working copy", "commit working copy",
  "update file", "restore version", "share a file", "unshare a file", "file shares",
  "who can access a file", "move a file to a folder",
  or any task involving Elnora Platform file management.
  NOT for searching file contents across files — use elnora-search for that.
---

# Elnora Files

Browse, read, create, upload, version, and manage files on the Elnora AI Platform.

## Tool Access

Elnora is available via two methods. Use whichever is configured.

**Option A — CLI via Bash (preferred)**

Run commands via your Bash/Shell tool as `elnora <group> <action> ...`. Verify with `elnora --version`. CLI uses ~5× fewer tokens than MCP.

**Option B — MCP tools (when CLI isn't installed)**

Look for tools prefixed `mcp__elnora__` in your available tools. Call them with structured parameters (camelCase — e.g. `projectId`, not `project-id`). See the "MCP Tool Names" table below for the mapping.

**If neither is available, tell the user to install one:**

- CLI: `curl -fsSL https://cli.elnora.ai/install.sh | bash` (macOS/Linux)
  or `irm https://cli.elnora.ai/install.ps1 | iex` (Windows)
- MCP: `claude mcp add elnora --transport http --scope user https://mcp.elnora.ai/mcp`
  then `/mcp` to authenticate.

**Never fabricate tool names.** Valid commands are in the Commands section; their MCP equivalents are in the MCP Tool Names table.

## Invocation

```bash
CLI="elnora"
```

## Commands

### List Files

```bash
$CLI --compact files list --project <PROJECT_ID>
$CLI --compact files list --project <PROJECT_ID> --page 2 --page-size 50
$CLI --compact --fields "id,name" files list --project <PROJECT_ID>
```

`--project` is required.

### Get File Metadata

```bash
$CLI --compact files get <FILE_ID>
```

Returns metadata (name, type, size, timestamps) without actual content.

### Get File Content

```bash
$CLI files content <FILE_ID>
```

Returns raw file content to stdout. Pipe to save:

```bash
$CLI files content <FILE_ID> > protocol.md
```

Note: `--compact` or `--fields` wraps output in JSON. Omit both for raw text.

### Download File

```bash
$CLI files download <FILE_ID>
```

Downloads file content via the `/download` endpoint (may differ from `content` in backend handling).

### Get Version History

```bash
$CLI --compact files versions <FILE_ID>
$CLI --compact files versions <FILE_ID> --page-size 10
```

### Get Version Content

```bash
$CLI files version-content <FILE_ID> <VERSION_ID>
```

Both `<FILE_ID>` and `<VERSION_ID>` are positional. Returns raw content.

### Create Version

```bash
$CLI --compact files create-version <FILE_ID>
$CLI --compact files create-version <FILE_ID> --content "Updated protocol text"
```

### Restore Version

```bash
$CLI --compact files restore <FILE_ID> <VERSION_ID>
```

Both positional. Destructive — confirm with user first.

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
| `--folder` | No | Folder UUID |

### Upload File

```bash
$CLI --compact files upload --project <PROJECT_ID> --file-path /path/to/file.md
$CLI --compact files upload --project <PROJECT_ID> --file-path /path/to/data.csv --file-name "renamed.csv" --content-type "text/csv"
```

Three-step process (handled automatically): presigned URL, upload, confirm.

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--file-path` | Yes | Local file path |
| `--file-name` | No | Override filename |
| `--content-type` | No | MIME type (defaults to application/octet-stream) |

### Upload Batch

```bash
$CLI --compact files upload-batch --project <PROJECT_ID> --file-paths "a.pdf,b.docx,c.txt"
$CLI --compact files upload-batch --project <PROJECT_ID> --file-paths "file1.md,file2.md" --folder <FOLDER_ID>
```

Uploads up to 50 files. Returns per-file success/failure results.

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--file-paths` | Yes | Comma-separated local file paths |
| `--folder` | No | Folder UUID (applies to all files) |

### Confirm Upload

```bash
$CLI --compact files confirm-upload <FILE_ID>
```

Only needed if `upload` was interrupted after the PUT step.

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

`--visibility` is required.

### Fork File

```bash
$CLI --compact files fork <FILE_ID> --target-project <PROJECT_ID>
```

`<FILE_ID>` is positional (`fileId`). `--target-project` is a flag (`targetProject` doesn't end in "Id").

### Working Copy

```bash
$CLI --compact files working-copy <FILE_ID>
$CLI --compact files working-copy <FILE_ID> --task <TASK_ID>
```

### Commit Working Copy

```bash
$CLI --compact files commit <FILE_ID>
```

### Search File Content

```bash
$CLI --compact files search-content --query "annealing temperature"
$CLI --compact files search-content --query "BRCA1" --project <PROJECT_ID>
$CLI --compact files search-content --query "gel electrophoresis" --page-size 10
```

Full-text search inside file contents. Also available as `search file-content`.

| Flag | Required | Notes |
|------|----------|-------|
| `--query` | Yes | Search query string (no `-q` shorthand) |
| `--project` | No | Project UUID to filter |
| `--page` | No | Page number (default 1) |
| `--page-size` | No | Results per page (default 25, max 100) |

### Move File

```bash
$CLI --compact files move <FILE_ID> <PARENT_FOLDER_ID>
```

Move a file into a different Knowledge Base folder. Both `<FILE_ID>` and `<PARENT_FOLDER_ID>` are positional. You need write access on both the file's current folder and the destination.

### Share File

```bash
$CLI --compact files share <FILE_ID> --user-id <USER_ID>
$CLI --compact files share <FILE_ID> --user-id <USER_ID> --role viewer
$CLI --compact files share <FILE_ID> --org-wide
```

Grant access to a file. Provide **exactly one** recipient: `--user-id` (a specific member) or `--org-wide` (everyone in the organization).

| Flag/Arg | Required | Notes |
|----------|----------|-------|
| `<FILE_ID>` | Yes | Positional — file UUID |
| `--user-id` | * | Member's numeric user id. Find it with `orgs directory`. |
| `--org-wide` | * | Share with the whole organization |
| `--role` | No | `viewer`, `editor` (default), or `admin` |

\* Exactly one of `--user-id` / `--org-wide` is required.

### List / Revoke File Shares

```bash
$CLI --compact files shares <FILE_ID>              # list current shares (each has an "id" = ACE id)
$CLI --compact files unshare <FILE_ID> <ACE_ID>    # revoke one share
```

## MCP Tool Names

| CLI command | MCP tool name |
|-------------|---------------|
| `files list` | `elnora_files_list` |
| `files get` | `elnora_files_get` |
| `files content` | `elnora_files_content` |
| `files download` | `elnora_files_download` |
| `files versions` | `elnora_files_versions` |
| `files version-content` | `elnora_files_versionContent` |
| `files create-version` | `elnora_files_createVersion` |
| `files restore` | `elnora_files_restore` |
| `files create` | `elnora_files_create` |
| `files upload` | `elnora_files_upload` |
| `files upload-batch` | `elnora_files_uploadBatch` |
| `files confirm-upload` | `elnora_files_confirmUpload` |
| `files update` | `elnora_files_update` |
| `files archive` | `elnora_files_archive` |
| `files promote` | `elnora_files_promote` |
| `files fork` | `elnora_files_fork` |
| `files working-copy` | `elnora_files_workingCopy` |
| `files commit` | `elnora_files_commit` |
| `files search-content` | `elnora_files_searchContent` |
| `files move` | `elnora_files_move` |
| `files share` | `elnora_files_share` |
| `files unshare` | `elnora_files_unshare` |
| `files shares` | `elnora_files_shares` |

## Agent Recipes

**Read a protocol from a project:**

```bash
$CLI --compact --fields "id,name" files list --project <PROJECT_ID>
$CLI files content <FILE_ID>
```

**Upload a file and reference it in a task:**

```bash
$CLI --compact files upload --project <PROJECT_ID> --file-path /path/to/protocol.md
# Use the returned file ID:
$CLI --compact tasks send <TASK_ID> --message "Optimize this protocol" --file-refs "<FILE_ID>" --wait
```

**Edit-in-place (working copy):**

```bash
WC=$($CLI --compact files working-copy <FILE_ID> | jq -r '.id')
# ... make edits externally ...
$CLI --compact files commit "$WC"
```
