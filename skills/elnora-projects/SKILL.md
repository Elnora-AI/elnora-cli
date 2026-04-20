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

## Choosing a Project

Many commands require a project ID. Resolve it once per session, then reuse.

```bash
$CLI --compact --fields "id,name" projects list
```

**Decision tree:**

1. **One project** → use it automatically, don't ask.
2. **2–5 projects** → show the list, ask the user to pick by name or number. Remember the choice.
3. **6+ projects** → ask the user to name or describe their project. Match by name. Don't dump the full list.
4. **Zero projects** → tell the user to create one: `$CLI projects create --name "My Project"`.

**Never re-list projects for every command.** Cache the project ID after the first lookup. If the user says "switch to project X", re-list then.

## MCP Tool Names

| CLI command | MCP tool name |
|-------------|---------------|
| `projects list` | `elnora_projects_list` |
| `projects get` | `elnora_projects_get` |
| `projects create` | `elnora_projects_create` |
| `projects update` | `elnora_projects_update` |
| `projects archive` | `elnora_projects_archive` |
| `projects members` | `elnora_projects_members` |
| `projects add-member` | `elnora_projects_addMember` |
| `projects update-role` | `elnora_projects_updateRole` |
| `projects remove-member` | `elnora_projects_removeMember` |
| `projects leave` | `elnora_projects_leave` |

## Agent Recipes

**Full project setup with members:**

```bash
PROJECT=$($CLI --compact projects create --name "New Lab" | jq -r '.id')
$CLI --compact projects add-member "$PROJECT" <USER_ID> --role Member
```
