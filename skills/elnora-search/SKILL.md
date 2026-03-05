---
name: elnora-search
description: >
  This skill should be used when the user asks to "search tasks", "find a protocol",
  "search files", "find tasks about", "look up", "query Elnora", or any task
  involving searching the Elnora Platform for tasks or files by keyword.
---

# Elnora Search

Search tasks and files across all projects by keyword query.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

## Commands

### Search Tasks

```bash
$CLI --compact search tasks --query "PCR protocol"
$CLI --compact search tasks --query "BRCA1" --page-size 10
```

Returns paginated results with relevance ranking:

```json
{"items":[{"type":"task","id":"<UUID>","title":"...","snippet":"...with <b>highlighted</b> matches...","projectId":"<UUID>","createdAt":"...","rank":0.06}],"page":1,"totalCount":N,"hasNextPage":false}
```

Results include `snippet` with HTML-bold match highlights and `rank` for relevance sorting.

Use task IDs from results with `tasks get` or `tasks messages` to read full conversations.

### Search Files

```bash
$CLI --compact search files --query "gel electrophoresis"
$CLI --compact search files --query "template" --page 2
```

Same pagination shape. Use file IDs from results with `files get` or `files content`.

## Options

Both commands share:

| Flag | Default | Notes |
|------|---------|-------|
| `--query` | Required | Search query string |
| `--page` | 1 | Page number |
| `--page-size` | 25 | Results per page (max 100) |

## Agent Recipes

**Find a task by protocol name, then read it:**

```bash
TASK_ID=$($CLI --compact search tasks --query "BRCA1" | jq -r '.items[0].id')
$CLI --compact tasks messages "$TASK_ID"
```

**Find all files matching a keyword:**

```bash
$CLI --compact --fields "id,name" search files --query "PCR"
```
