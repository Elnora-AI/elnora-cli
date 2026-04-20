---
name: elnora-tasks
description: >
  This skill should be used when the user asks to "create a task", "send a message",
  "generate a protocol", "list tasks", "get task", "view task details",
  "read task messages", "update task status", "archive a task", "talk to Elnora",
  "ask Elnora to generate", "protocol conversation",
  or any task involving Elnora Platform task management and protocol generation.
---

# Elnora Tasks

Tasks are conversations with the Elnora AI Agent. Send messages to generate protocols, iterate on outputs, and reference uploaded files.

## Tool Access

Elnora is available via two methods. Use whichever is configured.

**Option A — CLI via Bash (preferred)**

Run commands via your Bash/Shell tool as `elnora <group> <action> ...`. Verify with `elnora --version`. CLI uses ~5× fewer tokens than MCP.

**Option B — MCP tools (when CLI isn't installed)**

Look for tools prefixed `mcp__elnora__` in your available tools. Call them with structured parameters (camelCase — e.g. `projectId`, `taskId`, not `project-id`). See the "MCP Tool Names" table below for the mapping.

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

## Response Retrieval

The Elnora backend processes agent responses asynchronously. When you send a message, the POST returns immediately with the user message echo — the AI response arrives separately. Use `--stream` or `--wait` to collect it.

| Mode | Flag | Behavior | Timeout | Use when |
|------|------|----------|---------|----------|
| **Streaming** | `--stream` | Real-time SSE token-by-token output | 300s | **Default choice.** Best UX, longest timeout, pipeable |
| Polling | `--wait` | Auto-polls every 2s until assistant message appears | 120s | You need the JSON message object, not real-time output |
| Fire-and-forget | _(no flag)_ | Returns immediately, no response | — | You'll check `tasks messages` manually later |

**Recommended:** Always use `--stream` unless you have a specific reason not to. Content tokens go to stdout, status events (`think`, `tool_start`, `tool_end`, `progress`) go to stderr — so output is pipeable: `elnora tasks send ... --stream > response.txt`.

**MCP mode** (`elnora_tasks_send`): Always collects the full response automatically via streaming, with polling as fallback. The caller receives `{ sent, taskId, response }` with the complete assistant content.

SSE event types:

| Event | Payload | Direction | Description |
|-------|---------|-----------|-------------|
| `think` | `content`, `turn` | stderr | Agent reasoning/planning status |
| `tool_start` | `tool` | stderr | Tool execution begins |
| `tool_end` | `tool`, `duration_ms`, `success` | stderr | Tool execution completed |
| `progress` | `content` | stderr | Intermediate status message |
| `token` | `content`, `agent` | stdout | Streamed response content |
| `completed` | `content` (optional) | — | Stream finished, client must close |
| `error` | `content` | stderr | Pipeline error, client must close |
| `timeout` | — | stderr | 300s inactivity, client must close |

**IMPORTANT — Always show the full response:** When Elnora returns a response (protocol, literature review, analysis, etc.), print the **entire** assistant content back to the user. No truncation, no summarization, no "here are the key points." The user asked Elnora to generate something — show them everything Elnora said, including comments, suggestions, warnings, and explanations. Strip JSON wrapper/metadata but preserve all human-readable content.

## Getting a Project ID

Every task belongs to a project. Use the decision tree in the `elnora-projects` skill's "Choosing a Project" section to pick one, then reuse the ID for the rest of the session. **Don't re-list projects for every task command.**

Quick reminder of the decision tree:

1. **One project** → use it automatically.
2. **2–5 projects** → ask user to pick by name or number.
3. **6+ projects** → ask user to name/describe; match by name.
4. **Zero** → tell user to create one first.

```bash
$CLI --compact --fields "id,name" projects list
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
{"items":[{"id":"<UUID>","projectId":"<UUID>","title":"...","status":"active","messageCount":4,"lastMessageAt":"...","createdAt":"..."}],"page":1,"pageSize":25,"totalCount":N,"totalPages":N,"hasNextPage":false,"hasPreviousPage":false}
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
| `--stream` | No | Stream agent response in real-time via SSE (300s timeout). Requires `--message` |
| `--wait` | No | Poll for agent response (120s timeout). Requires `--message` |

Returns the created task with its `id`. If `--message` is provided without `--stream` or `--wait`, the response is fire-and-forget — use `tasks messages` to check later.

### Send Message

```bash
# Stream response in real-time (recommended)
$CLI --compact tasks send <TASK_ID> --message "Use Taq polymerase" --stream

# Wait for response (returns message object)
$CLI --compact tasks send <TASK_ID> --message "Use Taq polymerase" --wait

# Fire-and-forget (returns immediately, check messages later)
$CLI --compact tasks send <TASK_ID> --message "Use Taq polymerase and set annealing to 58C"

# Reference uploaded files
$CLI --compact tasks send <TASK_ID> --message "Optimize based on this template" --file-refs "<FILE_ID_1>,<FILE_ID_2>" --stream
```

| Flag | Required | Notes |
|------|----------|-------|
| `--message` | Yes | Message content |
| `--file-refs` | No | Comma-separated file UUIDs to attach as context |
| `--stream` | No | Stream agent response in real-time via SSE (300s timeout) |
| `--wait` | No | Poll for agent response (120s timeout) |

**Streaming details:** Status events (`think`, `tool_start`, `tool_end`, `progress`) go to stderr, content tokens go to stdout. This makes streaming pipeable: `elnora tasks send ... --stream > response.txt`.

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

**Typical workflow (list projects → create task → stream response):**

```bash
# Step 1: Get the project ID (do this once, reuse for all commands)
$CLI --compact --fields "id,name" projects list
# Pick the project that matches the user's context. Example with one project:
# PROJECT="bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"

# Step 2: Create task and stream
$CLI --compact tasks create --project "$PROJECT" --title "PCR BRCA1" --message "Generate PCR protocol for BRCA1 exon 11" --stream
```

**Continue a conversation (reuse task ID):**

```bash
$CLI --compact tasks send "$TASK" --message "Add gel electrophoresis step" --stream
$CLI --compact tasks send "$TASK" --message "Reduce annealing temperature to 55C" --stream
```

**Read conversation history:**

```bash
$CLI --compact tasks messages <TASK_ID> | jq '.items[-1] | select(.role == "assistant") | .content'
```
