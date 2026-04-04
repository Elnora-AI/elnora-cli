---
name: elnora-tasks
description: >
  This skill should be used when the user asks to "create a task", "send a message",
  "generate a protocol", "list tasks", "read task messages", "update task status",
  "archive a task", "talk to Elnora", "ask Elnora to generate", "protocol conversation",
  or any task involving Elnora Platform task management and protocol generation.
---

# Elnora Tasks

Tasks are conversations with the Elnora AI Agent. Send messages to generate protocols, iterate on outputs, and reference uploaded files.

## Response Retrieval

The Elnora backend processes agent responses asynchronously. When you send a message, the POST returns immediately with the user message echo — the AI response arrives separately.

The CLI provides three modes for retrieving agent responses:

| Mode | Flag | Behavior | Timeout |
|------|------|----------|---------|
| Fire-and-forget | _(default)_ | Returns immediately, no response | — |
| Polling | `--wait` | Auto-polls every 2s until assistant message appears | 120s |
| Streaming | `--stream` | Real-time SSE token-by-token output | 300s |

**MCP mode** (`elnora_tasks_send`): Always collects the full response automatically via streaming, with polling as fallback. The caller receives `{ sent, taskId, response }` with the complete assistant content.

**Recommended:** Use `--wait` for simple interactions, `--stream` for long responses where you want real-time output.

## Invocation

```bash
CLI="elnora"
```

## Commands

### List Tasks

```bash
$CLI --compact tasks list
$CLI --compact tasks list --project <PROJECT_ID>
$CLI --compact tasks list --project <PROJECT_ID> --page 2 --page-size 50
```

Pagination: `--page` (default 1), `--page-size` (default 25, max 100).

Response:

```json
{"items":[{"id":"<UUID>","projectId":"<UUID>","title":"...","status":"active","messageCount":4,"lastMessageAt":"...","createdAt":"..."}],"page":1,"totalCount":N,"hasNextPage":false}
```

### Get Task

```bash
$CLI --compact tasks get <TASK_ID>
```

Returns full task detail. Use this to inspect a task before interacting.

### Create Task

```bash
$CLI --compact tasks create --project <PROJECT_ID> --title "PCR protocol for BRCA1" --message "Generate a simple PCR protocol for BRCA1 exon 11"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project UUID |
| `--title` | No | Task title (auto-generated if omitted) |
| `--message` | No | Initial message to start the conversation |

Returns the created task with its `id`. If `--message` is provided, the agent will process it asynchronously — use `tasks send --wait` or `tasks messages` to retrieve the response.

### Send Message

```bash
# Fire-and-forget (returns immediately)
$CLI --compact tasks send <TASK_ID> --message "Use Taq polymerase and set annealing to 58C"

# Wait for agent response (polls until complete, 120s timeout)
$CLI --compact tasks send <TASK_ID> --message "Use Taq polymerase" --wait

# Stream response in real-time via SSE
$CLI --compact tasks send <TASK_ID> --message "Use Taq polymerase" --stream

# Reference uploaded files
$CLI --compact tasks send <TASK_ID> --message "Optimize based on this template" --file-refs "<FILE_ID_1>,<FILE_ID_2>"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--message` | Yes | Message content |
| `--file-refs` | No | Comma-separated file UUIDs to attach as context |
| `--wait` | No | Poll for agent response (120s timeout) |
| `--stream` | No | Stream agent response in real-time via SSE |

**Streaming details:** Status events (thinking, tool use) go to stderr, content tokens go to stdout. This makes streaming pipeable: `elnora tasks send ... --stream > response.txt`.

SSE event types: `think`, `tool_start`, `tool_end`, `progress`, `token`, `completed`, `error`, `timeout`.

### Get Messages

```bash
$CLI --compact tasks messages <TASK_ID>
$CLI --compact tasks messages <TASK_ID> --limit 10
$CLI --compact tasks messages <TASK_ID> --cursor <CURSOR>
```

Response — messages ordered by `sequence`, with `role` (user/assistant):

```json
{"items":[{"id":"<UUID>","role":"user","content":"...","sequence":1,"createdAt":"..."},{"id":"<UUID>","role":"assistant","content":"...","metadata":"{\"status\":\"completed\"}","sequence":2,"createdAt":"..."}],"nextCursor":null,"hasMore":false}
```

Cursor-based pagination: if `hasMore` is true, pass `nextCursor` as `--cursor`. Default limit is 50 (max 100).

### Update Task

```bash
$CLI --compact tasks update <TASK_ID> --title "Updated title"
$CLI --compact tasks update <TASK_ID> --status completed
```

Must provide at least one of `--title` or `--status`.

### Archive Task

```bash
$CLI --compact tasks archive <TASK_ID>
# -> {"archived":true,"taskId":"<UUID>"}
```

Destructive — confirm with user before running.

## MCP Tool Names

All commands are auto-registered as MCP tools with the `elnora_` prefix:

| CLI command | MCP tool name |
|-------------|---------------|
| `tasks list` | `elnora_tasks_list` |
| `tasks get` | `elnora_tasks_get` |
| `tasks create` | `elnora_tasks_create` |
| `tasks send` | `elnora_tasks_send` |
| `tasks messages` | `elnora_tasks_messages` |
| `tasks update` | `elnora_tasks_update` |
| `tasks archive` | `elnora_tasks_archive` |

MCP tools accept the same parameters as CLI flags (camelCase). `elnora_tasks_send` always waits for the full agent response.

## Agent Recipes

**Full protocol generation with --wait:**

```bash
PROJECT=$($CLI --compact --fields "id" projects list | jq -r '.items[0].id')
TASK=$($CLI --compact tasks create --project "$PROJECT" --title "PCR BRCA1" --message "Generate PCR protocol for BRCA1 exon 11" | jq -r '.id')
$CLI --compact tasks send "$TASK" --message "Add gel electrophoresis step" --wait
```

**Read latest assistant response:**

```bash
$CLI --compact tasks messages <TASK_ID> | jq '.items[-1] | select(.role == "assistant") | .content'
```

**Manual polling (custom timeout/retry):**

```bash
# Poll until the last message is from the assistant
LAST=$($CLI --compact tasks messages <TASK_ID> | jq '.items[-1]')
echo "$LAST" | jq '{role: .role, status: (.metadata | fromjson? // {} | .status)}'
# -> {"role":"assistant","status":"completed"}  <- ready
# -> {"role":"user","status":null}              <- still processing
```
