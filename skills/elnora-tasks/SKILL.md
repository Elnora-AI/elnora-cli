---
name: elnora-tasks
description: >
  This skill should be used when the user asks to "create a task", "send a message",
  "generate a protocol", "list tasks", "read task messages", "update task status",
  "archive a task", "talk to Elnora", "ask Elnora to generate", "protocol conversation",
  or any task involving Elnora Platform task management and protocol generation.
---

# Elnora Tasks

Tasks are conversations with the Elnora AI Platform. Send messages to generate protocols, iterate on outputs, and reference uploaded files.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

## Commands

### List Tasks

```bash
# All tasks
$CLI --compact tasks list

# Tasks in a specific project
$CLI --compact tasks list --project <PROJECT_ID>

# Paginate
$CLI --compact tasks list --project <PROJECT_ID> --page 2 --page-size 50
```

Response — each task has `id`, `title`, `status`, `messageCount`:

```json
{"items":[{"id":"<UUID>","projectId":"<UUID>","title":"...","status":"active","messageCount":4,"lastMessageAt":"...","createdAt":"..."}],"page":1,"totalCount":N,"hasNextPage":false}
```

### Get Task

```bash
$CLI --compact tasks get <TASK_ID>
```

Returns full task detail including `messages` array and `fileReferences`. Use this instead of separate `messages` call when the full context is needed in one shot.

### Create Task

```bash
$CLI --compact tasks create --project <PROJECT_ID> --title "PCR protocol for BRCA1" --message "Generate a simple PCR protocol for BRCA1 exon 11"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--title` | No | Task title (auto-generated if omitted) |
| `--message` | No | Initial message to start the conversation |

Returns the created task with its `id`. Use this ID for subsequent `send` and `messages` calls.

### Send Message

```bash
# Simple message
$CLI --compact tasks send <TASK_ID> --message "Use Taq polymerase and set annealing to 58C"

# Reference uploaded files
$CLI --compact tasks send <TASK_ID> --message "Optimize based on this template" --file-refs "<FILE_ID_1>,<FILE_ID_2>"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--message` | Yes | Message content |
| `--file-refs` | No | Comma-separated file UUIDs to attach as context |

Returns the created message object.

### Get Messages

```bash
$CLI --compact tasks messages <TASK_ID>
$CLI --compact tasks messages <TASK_ID> --limit 10
$CLI --compact tasks messages <TASK_ID> --cursor <CURSOR>
```

Response — messages ordered by `sequence`, with `role` (user/assistant):

```json
{"items":[{"id":"<UUID>","role":"user","content":"...","sequence":1,"createdAt":"...","attachments":[]},{"id":"<UUID>","role":"assistant","content":"...","metadata":"{\"status\":\"completed\"}","sequence":2,"createdAt":"...","attachments":[]}],"nextCursor":null,"hasMore":false}
```

Cursor-based pagination: if `hasMore` is true, pass `nextCursor` as `--cursor`.

### Update Task

```bash
$CLI --compact tasks update <TASK_ID> --title "Updated title"
$CLI --compact tasks update <TASK_ID> --status completed
$CLI --compact tasks update <TASK_ID> --title "New name" --status completed
```

Must provide at least one of `--title` or `--status`. Exits 1 with suggestion if neither is given.

### Archive Task

```bash
$CLI --compact tasks archive <TASK_ID>
# → {"archived":true,"taskId":"<UUID>"}
```

Destructive operation — confirm with user before running.

## Agent Recipes

**Full protocol generation flow:**

```bash
# 1. Find or create project
PROJECT=$($CLI --compact --fields "id" projects list | jq -r '.items[0].id')

# 2. Create task with initial prompt
TASK=$($CLI --compact tasks create --project "$PROJECT" --title "PCR BRCA1" --message "Generate PCR protocol for BRCA1 exon 11" | jq -r '.id')

# 3. Wait, then read assistant response
$CLI --compact tasks messages "$TASK" --limit 5

# 4. Iterate
$CLI --compact tasks send "$TASK" --message "Add gel electrophoresis verification step"
```

**Check latest assistant response only:**

```bash
$CLI --compact tasks messages <TASK_ID> --limit 1
# Last message is the most recent — check role=="assistant"
```
