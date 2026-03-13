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

**Async processing:** After `send`, the Elnora agent processes your message asynchronously. The response is NOT immediate — you must poll `messages` to check for the assistant reply. See [Waiting for Responses](#waiting-for-responses) below.

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

## Waiting for Responses

After `tasks send` or `tasks create --message`, the Elnora agent processes asynchronously. There is no streaming via the CLI — you must poll.

**How to poll:**

```bash
# Poll until the last message is from the assistant with status "completed"
LAST=$($CLI --compact tasks messages <TASK_ID> | jq '.items[-1]')
echo "$LAST" | jq '{role: .role, status: (.metadata | fromjson? // {} | .status)}'
# → {"role":"assistant","status":"completed"}  ← ready
# → {"role":"user","status":null}              ← still processing, wait and retry
```

**Status values** in assistant message `metadata`:

| `metadata.status` | Meaning |
|-------------------|---------|
| `"completed"` | Agent finished successfully — read `.content` for the response |
| `"error"` | Agent encountered an error — `.metadata` may contain `error_type` |

**Polling strategy:**
1. Wait **5 seconds** after sending, then poll `tasks messages`
2. Check if the last message has `role: "assistant"`
3. If not, wait **10 seconds** and poll again (responses can take seconds to several minutes for complex multi-tool protocols)
4. **Timeout after 5 minutes** — the platform's own processing timeout is 300 seconds

**No intermediate statuses** — messages jump directly to `completed` or `error` once the agent finishes. If the last message is still `role: "user"`, the agent hasn't responded yet.

## Agent Recipes

**Full protocol generation flow with polling:**

```bash
# 1. Find or create project
PROJECT=$($CLI --compact --fields "id" projects list | jq -r '.items[0].id')

# 2. Create task with initial prompt
TASK=$($CLI --compact tasks create --project "$PROJECT" --title "PCR BRCA1" --message "Generate PCR protocol for BRCA1 exon 11" | jq -r '.id')

# 3. Poll for assistant response
sleep 5
while true; do
  LAST_ROLE=$($CLI --compact tasks messages "$TASK" | jq -r '.items[-1].role')
  [ "$LAST_ROLE" = "assistant" ] && break
  sleep 10
done

# 4. Read the completed response
$CLI --compact tasks messages "$TASK" | jq '.items[-1].content'

# 5. Iterate
$CLI --compact tasks send "$TASK" --message "Add gel electrophoresis verification step"
```

**Check latest assistant response only:**

```bash
$CLI --compact tasks messages <TASK_ID> | jq '.items[-1] | {role, content, status: (.metadata | fromjson? // {} | .status)}'
```
