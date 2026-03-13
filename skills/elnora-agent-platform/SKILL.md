---
name: elnora-agent-platform
description: >
  This skill should be used when the user asks about "agent file operations",
  "agent create file", "agent save file", "agent read file", "agent link file",
  "agent search files", "agent task attachments", "agent progress updates",
  "agent file search", "agent grep", "update task title",
  or any task involving the Elnora Agent's internal platform tools for file and task operations.
---

# Elnora Agent — Platform Tools (11)

> **REFERENCE ONLY — not callable from the CLI.** These are the agent's internal tools. You cannot run them directly. The agent uses them automatically when processing your task messages. This skill exists so you know what the agent is capable of.

Sync wrappers around the .NET backend API for file and task operations.

```bash
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
$CLI --compact tasks send <TASK_ID> --message "Your request here"
```

## Tools

| Tool | Purpose | When the agent uses it |
|------|---------|------------------------|
| `create_file` | Create new file in project | Agent generates a protocol or output file |
| `save_file_content` | Save new version to S3 | Agent writes/updates file content |
| `read_file` | Read file content from S3 | Agent needs to read an existing file |
| `link_file_to_task` | Link file as input/output to task | Agent associates a file with the current task |
| `search_files` | Search by name/description/tags | Agent looks up files by metadata |
| `list_project_files` | List all files (optionally by type) | Agent browses project contents |
| `search_file_content` | Full-text search inside files | Agent searches within file bodies |
| `grep_file` | Regex search in single file | Agent does pattern matching in a file |
| `create_task_attachment` | Create S3 presigned upload URL | Agent uploads binary attachments |
| `update_task_title` | Update task title based on work | Agent renames the task to reflect what it did |
| `send_progress_update` | Send visible progress message | Agent sends a status update to the user |

## Notes

- These are the agent's internal tools — not directly callable from the CLI.
- The agent uses them automatically when processing your task messages.
- File operations go through S3 presigned URLs via the .NET backend.
- `send_progress_update` is how the agent sends intermediate status while working.

## Agent Recipes

**Ask the agent to create a file:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Generate a PCR protocol and save it as a new file called pcr-brca1.md"
```

**Ask the agent to search inside files:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Search all project files for mentions of 'annealing temperature' and summarize what you find"
```

**Reference existing files for context:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Read the attached template and generate a new version" --file-refs "<FILE_ID>"
```
