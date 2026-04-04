---
name: elnora-folders
description: >
  This skill should be used when the user asks to "create folder", "list folders",
  "rename folder", "move folder", "delete folder", "organize files into folders",
  or any task involving Elnora Platform project folder management.
---

# Elnora Folders

Manage the folder tree within Elnora projects.

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
