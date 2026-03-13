---
name: elnora-agent-memory
description: >
  This skill should be used when the user asks about "agent memory", "agent remember",
  "agent recall", "agent findings", "shared findings", "agent scratchpad",
  "cross-agent memory", "agent context", "task context", "conversation summary",
  "agent forget", "persistent memory",
  or any task involving the Elnora Agent's context sharing and long-term memory capabilities.
---

# Elnora Agent — Context & Memory (9 tools)

> **REFERENCE ONLY — not callable from the CLI.** These are the agent's internal memory tools. You cannot run them directly. Instead, ask the agent to remember or recall things via `tasks send`. This skill exists so you know what the agent is capable of.

The agent has two memory systems: context management for cross-agent sharing within a task, and long-term memory that persists across tasks.

```bash
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
$CLI --compact tasks send <TASK_ID> --message "Your request here"
```

## Context Management (4 tools)

Cross-agent shared memory and findings scoped to the current task (14-day TTL).

| Tool | Purpose | When the agent uses it |
|------|---------|------------------------|
| `save_finding` | Save finding for other agents (task scope) | Agent discovers something worth sharing |
| `search_findings` | Semantic search over shared findings | Agent looks for prior discoveries |
| `get_task_context` | Get all shared findings for current task | Agent loads context at task start |
| `save_scratchpad` | Save private agent working notes (not shared) | Agent stores intermediate reasoning |

## Memory Management (5 tools)

Long-term persistent memory across tasks.

| Tool | Purpose | When the agent uses it |
|------|---------|------------------------|
| `remember` | Save memory (user or project scope) | Agent stores a fact for future use |
| `recall` | Semantic search over memories | Agent retrieves previously stored facts |
| `list_memories` | List all stored memories | Agent reviews what it knows |
| `forget` | Delete specific memory | Agent removes outdated info |
| `get_conversation_summary` | Get recent message history | Agent reviews conversation context |

## Scope

- **User scope:** Memories tied to the user, available across all projects and tasks.
- **Project scope:** Memories tied to a specific project, shared across tasks in that project.

## Agent Recipes

**Ask the agent to remember a preference:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Remember that our lab uses Q5 polymerase for all high-fidelity PCR and annealing at 62C"
```

**Ask the agent to recall prior context:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "What do you remember about our PCR preferences? Recall any relevant memories."
```

**Ask the agent to share findings across tasks:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Save your findings about BRCA1 mutations so other tasks can reference them"
```
