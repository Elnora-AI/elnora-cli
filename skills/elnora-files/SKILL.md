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

Browse, read, create, upload, version, and manage files on the Elnora AI Platform.

## Tool Access

Elnora is a **command-line tool**. Run commands via your Bash/Shell tool.

- **Command:** `elnora`
- **Verify:** `elnora --version`
- **If not found:** tell the user to install it. Detect their platform:
  - macOS/Linux: `curl -fsSL https://cli.elnora.ai/install.sh | bash`
  - Windows (PowerShell): `irm https://cli.elnora.ai/install.ps1 | iex`
  - Any platform with Node.js: `npm install -g @elnora-ai/cli`

**CLI is the recommended path** — it uses fewer tokens, is more reliable, and the commands below are ready to copy-paste.

If MCP tools prefixed `mcp__elnora__` are available in your tool list, they work too — use whichever the user prefers or whichever is already configured in your environment.

**Never fabricate function names** like `elnora_generate_protocol`. All valid commands are listed under "Commands" in this skill.

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
