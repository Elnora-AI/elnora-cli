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

```bash
CLI="elnora"
```

## Commands

### List Projects

```bash
$CLI --compact projects list
$CLI --compact projects list --page 2 --page-size 50
$CLI --compact --fields "id,name" projects list
```

Response:

```json
{"items":[{"id":"<UUID>","name":"...","description":"...","isDefault":false,"isArchived":false,"memberCount":1,"myRole":"owner","createdAt":"..."}],"page":1,"totalCount":N,"hasNextPage":false}
```

### Get Project

```bash
$CLI --compact projects get <PROJECT_ID>
```

Returns project detail with `members` array.

### Create Project

```bash
$CLI --compact projects create --name "Protocol Lab" --description "PCR protocols" --icon "lab"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--name` | Yes | Project name |
| `--description` | No | Project description |
| `--icon` | No | Project icon |

### Update Project

```bash
$CLI --compact projects update <PROJECT_ID> --name "New Name"
$CLI --compact projects update <PROJECT_ID> --description "Updated description"
```

Must provide at least one of `--name`, `--description`, or `--icon`.

### Archive Project

```bash
$CLI --compact projects archive <PROJECT_ID>
# -> {"archived":true,"projectId":"<UUID>"}
```

Destructive — confirm with user before running.

### List Members

```bash
$CLI --compact projects members <PROJECT_ID>
```

### Add Member

```bash
$CLI --compact projects add-member <PROJECT_ID> <USER_ID> --role Member
```

Both `<PROJECT_ID>` and `<USER_ID>` are positional (`projectId` and `userId`). `--role` defaults to "Member".

### Update Member Role

```bash
$CLI --compact projects update-role <PROJECT_ID> <USER_ID> --role Admin
```

Both positional. `--role` is required.

### Remove Member

```bash
$CLI --compact projects remove-member <PROJECT_ID> <USER_ID>
# -> {"removed":true}
```

Both positional. Destructive — confirm with user before running.

### Leave Project

```bash
$CLI --compact projects leave <PROJECT_ID>
```

Removes the current user from the project.

## Agent Recipes

**Get the default project ID:**

```bash
$CLI --compact --fields "id,name" projects list --page-size 5
```

**Full project setup with members:**

```bash
PROJECT=$($CLI --compact projects create --name "New Lab" | jq -r '.id')
$CLI --compact projects add-member "$PROJECT" <USER_ID> --role Member
```
