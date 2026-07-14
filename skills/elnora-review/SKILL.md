---
name: elnora-review
description: >
  This skill should be used when the user asks to "review the knowledge base",
  "list review items", "KB review queue", "approve a review item", "reject a
  review item", "auto-tidy proposals", "pending KB changes", or any task
  involving the Elnora Platform Knowledge Base review queue.
---

# Elnora Knowledge Base Review

Approve or reject the auto-tidy proposals in the Knowledge Base review queue.
When KB auto-tidy is enabled for an organization (see `orgs set-autotidy` in the
`elnora-orgs` skill), the agent proposes folder/file renames, moves, archives,
and tags; those land here for a human to approve before they are applied.

## Tool Access

Elnora is available via two methods. Use whichever is configured.

**Option A — CLI via Bash (preferred)**

Run commands via your Bash/Shell tool as `elnora <group> <action> ...`. Verify with `elnora --version`. CLI uses ~5× fewer tokens than MCP.

**Option B — MCP tools (when CLI isn't installed)**

Look for tools prefixed `mcp__elnora__` in your available tools. Call them with structured parameters. See the "MCP Tool Names" table below for the mapping.

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

### List the Review Queue

```bash
$CLI --compact review list                 # pending items (default)
$CLI --compact review list --status all    # every state
$CLI --compact review list --status applied
$CLI --compact review list --status rejected
```

Each item has an `id` (the review item ID) and a proposed change (rename / move / archive / tag) on a target folder or file. `--status` is `pending` (default), `applied`, `rejected`, or `all`.

### Approve an Item

```bash
$CLI --compact review approve <ITEM_ID>
```

Applies the proposed change **as you** — you must have write access to the target, or the approve is rejected.

### Reject an Item

```bash
$CLI --compact review reject <ITEM_ID>
```

Records the item as rejected; no change is applied.

## MCP Tool Names

| CLI command | MCP tool name |
|-------------|---------------|
| `review list` | `elnora_review_list` |
| `review approve` | `elnora_review_approve` |
| `review reject` | `elnora_review_reject` |

## Agent Recipes

**Approve every pending rename, review everything else:**

```bash
$CLI --compact review list --status pending
# inspect each item, then for the ones to accept:
$CLI --compact review approve <ITEM_ID>
```
