---
name: elnora-platform
description: >
  This skill should be used when the user asks about "Elnora platform", "elnora CLI",
  "platform API", "elnora projects", "elnora tasks", "elnora files", "protocol generation",
  "platform search", or any task involving the Elnora AI Platform.
  Routes to domain-specific sub-skills for token-efficient guidance.
---

# Elnora Platform CLI

Route Elnora Platform queries to the correct sub-skill. Load only what is needed.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

Global flags go BEFORE the subcommand:

```bash
$CLI --compact projects list            # correct
$CLI projects list --compact            # WRONG — fails
```

## Global Flags

| Flag | Effect |
|------|--------|
| `--compact` | Minified JSON — always use for agent workflows |
| `--output csv` | CSV output for exports |
| `--fields "id,name"` | Return only these fields |

## Auth

Requires `ELNORA_API_KEY` in `.env` (prefix: `elnora_live_`). Also accepts `ELNORA_MCP_API_KEY`.

```bash
$CLI --compact auth status
# → {"authenticated":true,"totalProjects":N}
```

Get keys: platform.elnora.ai > Settings > API Keys

## Routing Table

| Need | Sub-skill | Trigger |
|------|-----------|---------|
| List/get/create projects | `elnora-projects` | project, workspace, create project |
| Create/manage/message tasks | `elnora-tasks` | task, protocol, send message, conversation |
| Browse/read project files | `elnora-files` | file, content, version history, protocol output |
| Find tasks or files by keyword | `elnora-search` | search, find, query |

## ID Format

All IDs are UUIDs: `bfdc6fbd-40ed-4042-9ea7-c79a5ec90085`. Invalid format exits 1 with a suggestion showing the correct list command.

## Pagination

List endpoints return:

```json
{"items":[...],"page":1,"pageSize":25,"totalCount":N,"totalPages":N,"hasNextPage":true}
```

Use `--page N --page-size N` (max 100). Check `hasNextPage` to paginate.

## Error Contract

Errors → stderr, exit 1:

```json
{"error":"message","code":"AUTH_FAILED","suggestion":"how to fix"}
```

| Code | Action |
|------|--------|
| `AUTH_FAILED` | Check ELNORA_API_KEY in .env |
| `NOT_FOUND` | Verify the UUID |
| `VALIDATION_ERROR` | Check parameters |
| `RATE_LIMITED` | Wait and retry |
| `SERVER_ERROR` | Retry later |

## Common Workflow

Projects contain tasks and files. Typical flow:

1. `projects list` → get project ID
2. `tasks list --project <ID>` → get task ID
3. `tasks messages <ID>` → read conversation
4. `tasks send <ID> --message "..."` → continue conversation
5. `files list --project <ID>` → browse generated outputs
6. `files content <FILE_ID>` → read a protocol file
