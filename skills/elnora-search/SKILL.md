---
name: elnora-search
description: >
  This skill should be used when the user asks to "search tasks", "find a protocol",
  "search files", "search file content", "search inside files", "find tasks about",
  "query Elnora", "search Elnora platform", "full text search",
  or any task involving searching the Elnora Platform for tasks, files, or all resources
  by keyword. NOT for web search — use elnora-agent for that.
---

# Elnora Search

Search tasks, files, or all resources across projects by keyword.

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
