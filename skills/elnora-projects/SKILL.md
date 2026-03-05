---
name: elnora-projects
description: >
  This skill should be used when the user asks to "list projects", "create a project",
  "get project details", "show my Elnora projects", "new project", "project members",
  "update project", "archive project", "add member", "remove member", "leave project",
  or any task involving Elnora Platform project management.
---

# Elnora Projects

Manage projects on the Elnora AI Platform. Projects are containers for tasks, files, and folders.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

## Commands

### List Projects

```bash
$CLI --compact projects list
$CLI --compact projects list --page 2 --page-size 50
$CLI --compact --fields "id,name" projects list
```

Response shape:

```json
{"items":[{"id":"<UUID>","name":"...","description":"...","icon":"...","isDefault":false,"isArchived":false,"memberCount":1,"myRole":"owner","createdAt":"...","updatedAt":"..."}],"page":1,"pageSize":25,"totalCount":N,"totalPages":N,"hasNextPage":false}
```

Key fields: `id` (needed for all other commands), `name`, `memberCount`, `myRole`.

### Get Project

```bash
$CLI --compact projects get <PROJECT_ID>
```

Returns project detail with `members` array:

```json
{"members":[{"id":"<UUID>","userId":N,"email":"...","displayName":"...","role":"owner","createdAt":"..."}],"id":"<UUID>","name":"...","description":"...","icon":"...","memberCount":1,"myRole":"owner"}
```

Use this to check membership and roles before performing operations.

### Create Project

```bash
$CLI --compact projects create --name "Protocol Lab" --description "PCR protocols" --icon "lab"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--name` | Yes | Project name |
| `--description` | No | Project description |
| `--icon` | No | Project icon |

Returns the created project object with its new `id`.

### Update Project

```bash
$CLI --compact projects update <PROJECT_ID> --name "New Name"
$CLI --compact projects update <PROJECT_ID> --description "Updated description"
$CLI --compact projects update <PROJECT_ID> --name "New" --description "Desc" --icon "new-icon"
```

Must provide at least one of `--name`, `--description`, or `--icon`. Exits 1 with suggestion if none given.

### Archive Project

```bash
$CLI --compact projects archive <PROJECT_ID>
# -> {"archived":true,"projectId":"<UUID>"}
```

Destructive operation — confirm with user before running.

### List Members

```bash
$CLI --compact projects members <PROJECT_ID>
```

Returns the list of members and their roles for a project.

### Add Member

```bash
$CLI --compact projects add-member <PROJECT_ID> --user-id <USER_UUID> --role Member
```

| Flag | Required | Notes |
|------|----------|-------|
| `--user-id` | Yes | User UUID to add |
| `--role` | No | Role to assign (default: "Member") |

### Update Member Role

```bash
$CLI --compact projects update-role <PROJECT_ID> <USER_UUID> --role Admin
```

`--role` is required.

### Remove Member

```bash
$CLI --compact projects remove-member <PROJECT_ID> <USER_UUID>
# -> {"removed":true,"projectId":"<UUID>","userId":"<UUID>"}
```

Destructive — confirm with user before running.

### Leave Project

```bash
$CLI --compact projects leave <PROJECT_ID>
```

Removes the current user from the project.

## Agent Recipes

**Get the default project ID quickly:**

```bash
$CLI --compact --fields "id,name" projects list --page-size 5
```

**Check if a project exists by name before creating:**

```bash
$CLI --compact --fields "id,name" projects list
# scan results — if not found, create it
```

**Full project setup with members:**

```bash
# 1. Create project
PROJECT=$($CLI --compact projects create --name "New Lab" | jq -r '.id')

# 2. Add a team member
$CLI --compact projects add-member "$PROJECT" --user-id <USER_UUID> --role Member
```
