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
