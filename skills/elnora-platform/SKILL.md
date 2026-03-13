---
name: elnora-platform
description: >
  This skill should be used when the user asks about "Elnora platform", "elnora CLI",
  "platform API", "elnora projects", "elnora tasks", "elnora files", "protocol generation",
  "platform search", "elnora orgs", "elnora folders", "elnora admin", "API keys",
  "elnora health", "elnora auth", or any task involving the Elnora AI Platform.
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
$CLI projects list --compact            # WRONG -- fails
```

## Global Flags

| Flag | Effect |
|------|--------|
| `--compact` | Minified JSON -- always use for agent workflows |
| `--output csv` | CSV output for exports |
| `--fields "id,name"` | Return only these fields |

## Auth

Requires `ELNORA_API_KEY` in `.env` (prefix: `elnora_live_`). Also accepts `ELNORA_MCP_API_KEY`.

```bash
$CLI --compact auth status
# -> {"authenticated":true,"totalProjects":N}
```

Get keys: platform.elnora.ai > Settings > API Keys

## Routing Table

| Need | Sub-skill | Trigger keywords |
|------|-----------|------------------|
| List/get/create/update/archive projects, manage members | `elnora-projects` | project, workspace, create project, members, add member |
| Create/manage/message tasks, protocol generation | `elnora-tasks` | task, protocol, send message, conversation, generate |
| Browse/read/upload/create/version/fork files | `elnora-files` | file, content, version history, upload, download, fork, working copy |
| Find tasks or files by keyword | `elnora-search` | search, find, query |
| Manage project folder trees | `elnora-folders` | folder, create folder, move folder |
| Org management, members, billing, invitations, shared library | `elnora-orgs` | organization, org, billing, invite, library |
| Auth, API keys, account, health, diagnostics | `elnora-admin` | login, logout, profiles, api key, health, account, feedback, audit, completion |
| Feature flags (SystemAdmin) | `elnora-admin` | feature flag, flags, set flag, list flags |
| What can the Elnora Agent do? (tools, search, memory) | `elnora-agent` | agent capabilities, agent tools, what can agent do |

## ID Format

All IDs are UUIDs: `bfdc6fbd-40ed-4042-9ea7-c79a5ec90085`. Invalid format exits 1 with a suggestion showing the correct list command.

## Pagination

List endpoints return:

```json
{"items":[...],"page":1,"pageSize":25,"totalCount":N,"totalPages":N,"hasNextPage":true}
```

Use `--page N --page-size N` (max 100). Check `hasNextPage` to paginate.

Message endpoints use cursor-based pagination: check `hasMore` and pass `--cursor <nextCursor>`.

## Error Contract

Errors -> stderr, exit code > 0:

```json
{"error":"message","code":"AUTH_FAILED","suggestion":"how to fix"}
```

| Code | Exit | Action |
|------|------|--------|
| `AUTH_FAILED` | 3 | Check ELNORA_API_KEY in .env |
| `NOT_FOUND` | 4 | Verify the UUID |
| `VALIDATION_ERROR` | 2 | Check parameters |
| `RATE_LIMITED` | 5 | Wait and retry |
| `SERVER_ERROR` | 6 | Retry later |
| `INTERNAL_ERROR` | 1 | Unexpected — report bug |

## Common Workflow

Projects contain tasks and files. Typical flow:

1. `projects list` -> get project ID
2. `tasks list --project <ID>` -> get task ID
3. `tasks messages <ID>` -> read conversation
4. `tasks send <ID> --message "..."` -> continue conversation
5. `files list --project <ID>` -> browse generated outputs
6. `files content <FILE_ID>` -> read a protocol file

## All Command Groups

```
elnora account      Manage user account, agreements, and legal docs
elnora api-keys     Manage API keys and creation policy
elnora audit        View audit logs
elnora auth         Manage authentication
elnora completion   Generate shell completion script
elnora feedback     Submit feedback
elnora files        Manage project files (incl. batch upload)
elnora flags        Manage global feature flags (SystemAdmin)
elnora folders      Manage project folders
elnora health       Check platform reachability
elnora library      Manage organization library
elnora orgs         Manage organizations (incl. set-default, delete, list-all)
elnora projects     Manage projects
elnora search       Search tasks, files, and file content
elnora tasks        Manage tasks
```
