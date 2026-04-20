---
name: elnora-folders
description: >
  This skill should be used when the user asks to "create folder", "list folders",
  "rename folder", "move folder", "delete folder", "organize files into folders",
  or any task involving Elnora Platform project folder management.
---

# Elnora Folders

Manage the folder tree within Elnora projects.

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

### List Folders

```bash
$CLI --compact folders list <PROJECT_ID>
```

`<PROJECT_ID>` is positional (`projectId`). Returns the folder tree for the project.

### Create Folder

```bash
$CLI --compact folders create <PROJECT_ID> --name "Experiments"
$CLI --compact folders create <PROJECT_ID> --name "Sub Folder" --parent-id <PARENT_FOLDER_ID>
```

| Flag/Arg | Required | Notes |
|----------|----------|-------|
| `<PROJECT_ID>` | Yes | Positional — project UUID |
| `--name` | Yes | Folder name |
| `--parent-id` | No | Parent folder UUID for nesting (optional, so it's a flag) |

### Rename Folder

```bash
$CLI --compact folders rename <FOLDER_ID> --name "New Name"
```

### Move Folder

```bash
$CLI --compact folders move <FOLDER_ID> <NEW_PARENT_ID>
$CLI --compact folders move <FOLDER_ID> root
```

Both `<FOLDER_ID>` and `<NEW_PARENT_ID>` are positional (`folderId` and `parentId`). Use `root` to move to the project root level.

### Delete Folder

```bash
$CLI --compact folders delete <FOLDER_ID>
# -> {"deleted":true,"folderId":"<UUID>"}
```

Destructive — confirm with user before running.

## MCP Tool Names

| CLI command | MCP tool name |
|-------------|---------------|
| `folders list` | `elnora_folders_list` |
| `folders create` | `elnora_folders_create` |
| `folders rename` | `elnora_folders_rename` |
| `folders move` | `elnora_folders_move` |
| `folders delete` | `elnora_folders_delete` |

## Agent Recipes

**Set up folder structure for a new project:**

```bash
PROJECT="<PROJECT_ID>"
$CLI --compact folders create "$PROJECT" --name "Protocols"
$CLI --compact folders create "$PROJECT" --name "Data"
$CLI --compact folders create "$PROJECT" --name "Reports"
```

**Move a file into a folder:**

```bash
$CLI --compact folders list <PROJECT_ID>
$CLI --compact files update <FILE_ID> --folder <FOLDER_ID>
```
