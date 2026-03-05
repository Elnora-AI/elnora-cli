---
name: elnora-projects
description: >
  This skill should be used when the user asks to "list projects", "create a project",
  "get project details", "show my Elnora projects", "new project", "project members",
  or any task involving Elnora Platform project management.
---

# Elnora Projects

Manage projects on the Elnora AI Platform. Projects are containers for tasks and files.

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
$CLI --compact projects create --name "Protocol Lab" --description "PCR protocols" --icon "🧬"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--name` | Yes | Project name |
| `--description` | No | Project description |
| `--icon` | No | Emoji icon |

Returns the created project object with its new `id`.

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
