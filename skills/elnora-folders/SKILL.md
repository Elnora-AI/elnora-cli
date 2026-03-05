---
name: elnora-folders
description: >
  This skill should be used when the user asks to "create folder", "list folders",
  "rename folder", "move folder", "delete folder", "organize files into folders",
  or any task involving Elnora Platform project folder management.
---

# Elnora Folders

Manage the folder tree within Elnora projects. Folders organize files into a hierarchy.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

## Commands

### List Folders

```bash
$CLI --compact folders list --project <PROJECT_ID>
```

`--project` is required. Returns the folder tree for the project.

### Create Folder

```bash
$CLI --compact folders create --project <PROJECT_ID> --name "Experiments"
$CLI --compact folders create --project <PROJECT_ID> --name "Sub Folder" --parent <PARENT_FOLDER_ID>
```

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--name` | Yes | Folder name |
| `--parent` | No | Parent folder UUID for nesting |

### Rename Folder

```bash
$CLI --compact folders rename <FOLDER_ID> --name "New Name"
```

`--name` is required.

### Move Folder

```bash
$CLI --compact folders move <FOLDER_ID> --parent <NEW_PARENT_ID>
$CLI --compact folders move <FOLDER_ID> --parent root
```

`--parent` is required. Use `root` to move to the project root level.

### Delete Folder

```bash
$CLI --compact folders delete <FOLDER_ID>
# -> {"deleted":true,"folderId":"<UUID>"}
```

Destructive -- confirm with user before running.

## Agent Recipes

**Set up a folder structure for a new project:**

```bash
PROJECT="<PROJECT_ID>"

# Create top-level folders
$CLI --compact folders create --project "$PROJECT" --name "Protocols"
$CLI --compact folders create --project "$PROJECT" --name "Data"
$CLI --compact folders create --project "$PROJECT" --name "Reports"
```

**Move a file into a folder:**

```bash
# List folders to get the target ID
$CLI --compact folders list --project <PROJECT_ID>

# Update the file's folder
$CLI --compact files update <FILE_ID> --folder <FOLDER_ID>
```
