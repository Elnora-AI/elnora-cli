---
name: elnora-folders
description: >
  This skill should be used when the user asks to "browse the knowledge base",
  "list KB folders", "show my folders", "open a folder", "create folder",
  "list folders", "rename folder", "move folder", "delete folder", "share a folder",
  "unshare a folder", "folder permissions", "who can access a folder", "organize files
  into folders", or any task involving Elnora Platform folder management.
---

# Elnora Folders

Browse and manage folders in Elnora. The **Knowledge Base** is the current folder
model (a workspace-wide tree with per-folder sharing); the older *project folder*
commands are legacy and take a `<PROJECT_ID>`.

## Browse the Knowledge Base

Start at the roots and walk the tree — you need a folder ID from here before you can
list its children or files.

```bash
$CLI --compact folders roots                 # top-level KB folders (Knowledge Base, memory, tasks, uploads, …)
$CLI --compact folders children <FOLDER_ID>  # child folders of a folder
$CLI --compact folders get <FOLDER_ID>       # folder details + breadcrumb path to root
$CLI --compact folders files <FOLDER_ID>     # files placed directly in a folder (paged: --page / --page-size)
```

`folders roots` takes no arguments (the org comes from your token). The others take a
positional `<FOLDER_ID>` (`folderId`).

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

> **Knowledge Base by default.** `create` / `rename` / `move` / `delete` operate on the
> Knowledge Base (the current folder model — same tree as `folders roots`/`children`). The
> old project-scoped folders are legacy; reach them with `--project` (create) or `--legacy`
> (rename/move/delete).

### Create Folder

```bash
$CLI --compact folders create --name "Experiments"
$CLI --compact folders create --name "Sub Folder" --parent-id <PARENT_FOLDER_ID>
$CLI --compact folders create --name "Legacy" --project <PROJECT_ID>   # legacy project folder
```

| Flag/Arg | Required | Notes |
|----------|----------|-------|
| `--name` | Yes | Folder name |
| `--parent-id` | No | Parent folder UUID for nesting |
| `--project` | No | Legacy: create a project-scoped folder in this project instead |

### Rename Folder

```bash
$CLI --compact folders rename <FOLDER_ID> --name "New Name"
$CLI --compact folders rename <FOLDER_ID> --name "New Name" --legacy   # a legacy project folder
```

### Move Folder

```bash
$CLI --compact folders move <FOLDER_ID> <NEW_PARENT_ID>
$CLI --compact folders move <FOLDER_ID> root
$CLI --compact folders move <FOLDER_ID> <NEW_PARENT_ID> --legacy
```

Both `<FOLDER_ID>` and `<NEW_PARENT_ID>` are positional (`folderId` and `parentId`). Use `root` to move to the top level.

### Delete Folder

```bash
$CLI --compact folders delete <FOLDER_ID>            # KB: archives the folder
# -> {"archived":true,"folderId":"<UUID>"}
$CLI --compact folders delete <FOLDER_ID> --legacy   # legacy: hard-deletes a project folder
```

Destructive — confirm with user before running.

### List Folders (legacy)

```bash
$CLI --compact folders list <PROJECT_ID>
```

Legacy project-scoped folder tree. `<PROJECT_ID>` is positional. For the Knowledge Base, browse with `folders roots` / `folders children` instead.

### Share a Folder

```bash
$CLI --compact folders share <FOLDER_ID> --user-id <USER_ID>
$CLI --compact folders share <FOLDER_ID> --org-wide --role viewer
```

Grant access to a folder (sub-folders and files inherit it). Provide **exactly one** recipient: `--user-id` (a specific member — find the id with `orgs directory`) or `--org-wide`. `--role` is `viewer`, `editor` (default), or `admin`.

### List / Revoke Folder Shares

```bash
$CLI --compact folders shares <FOLDER_ID>            # list current shares (each has an "id" = ACE id)
$CLI --compact folders unshare <FOLDER_ID> <ACE_ID>  # revoke one share
```

## MCP Tool Names

| CLI command | MCP tool name |
|-------------|---------------|
| `folders roots` | `elnora_folders_roots` |
| `folders children` | `elnora_folders_children` |
| `folders get` | `elnora_folders_get` |
| `folders files` | `elnora_folders_files` |
| `folders list` | `elnora_folders_list` |
| `folders create` | `elnora_folders_create` |
| `folders rename` | `elnora_folders_rename` |
| `folders move` | `elnora_folders_move` |
| `folders delete` | `elnora_folders_delete` |
| `folders share` | `elnora_folders_share` |
| `folders unshare` | `elnora_folders_unshare` |
| `folders shares` | `elnora_folders_shares` |

## Agent Recipes

**Set up a Knowledge Base folder structure:**

```bash
$CLI --compact folders create --name "Protocols"
$CLI --compact folders create --name "Data"
$CLI --compact folders create --name "Reports"
# nest one under another with --parent-id <FOLDER_ID>
```

**Move a file into a folder:**

```bash
$CLI --compact folders roots                 # find the folder to move into
$CLI --compact folders children <FOLDER_ID>
$CLI --compact files move <FILE_ID> <FOLDER_ID>
```
