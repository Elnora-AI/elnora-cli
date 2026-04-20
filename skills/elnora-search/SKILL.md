---
name: elnora-search
description: >
  This skill should be used when the user asks to "search tasks", "find a protocol",
  "search files", "search file content", "search inside files", "find tasks about",
  "query Elnora", "search Elnora platform", "full text search", "search all",
  "search everything", "find",
  or any task involving searching the Elnora Platform for tasks, files, or all resources
  by keyword. NOT for web search — use elnora-agent for that.
---

# Elnora Search

Search tasks, files, or all resources across projects by keyword.

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

### Search Tasks

```bash
$CLI --compact search tasks --query "PCR protocol"
$CLI --compact search tasks --query "BRCA1" --page-size 10
```

Results include `snippet` with HTML-bold match highlights and `rank` for relevance:

```json
{"items":[{"type":"task","id":"<UUID>","title":"...","snippet":"...with <b>highlighted</b> matches...","projectId":"<UUID>","rank":0.06}],"page":1,"totalCount":N,"hasNextPage":false}
```

### Search Files

```bash
$CLI --compact search files --query "gel electrophoresis"
$CLI --compact search files --query "template" --page 2
```

### Search File Content

```bash
$CLI --compact search file-content --query "annealing temperature"
$CLI --compact search file-content --query "BRCA1" --project-id <PROJECT_ID>
```

Full-text search inside file contents. Also available as `files search-content` (which uses `--project` instead of `--project-id`).

Note: `search file-content` uses `--project-id` (field name: `projectId`, optional so it's a flag). `files search-content` uses `--project` (field name: `project`).

### Search All

```bash
$CLI --compact search all --query "BRCA1"
$CLI --compact search all --query "transfection" --page-size 50
```

Searches both tasks and files. Results include a `type` field ("task" or "file").

## Shared Options

All four commands share:

| Flag | Default | Notes |
|------|---------|-------|
| `--query` | Required | Search query string |
| `--page` | 1 | Page number |
| `--page-size` | 25 | Results per page (max 100) |

## MCP Tool Names

| CLI command | MCP tool name |
|-------------|---------------|
| `search tasks` | `elnora_search_tasks` |
| `search files` | `elnora_search_files` |
| `search file-content` | `elnora_search_fileContent` |
| `search all` | `elnora_search_all` |

## Agent Recipes

**Find a task, then read it:**

```bash
TASK_ID=$($CLI --compact search tasks --query "BRCA1" | jq -r '.items[0].id')
$CLI --compact tasks messages "$TASK_ID"
```

**Broad search:**

```bash
$CLI --compact search all --query "HEK 293"
```
