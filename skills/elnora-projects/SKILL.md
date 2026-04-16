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

**List projects and pick one:**

```bash
$CLI --compact --fields "id,name" projects list
# Pick the project matching the user's context by name. If only one project, use it.
# If multiple and unclear, ask the user which project to use.
```

**Full project setup with members:**

```bash
PROJECT=$($CLI --compact projects create --name "New Lab" | jq -r '.id')
$CLI --compact projects add-member "$PROJECT" <USER_ID> --role Member
```
