# Elnora CLI

Command-line interface for the [Elnora AI Platform](https://platform.elnora.ai).

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@elnora-ai/cli)](https://www.npmjs.com/package/@elnora-ai/cli)

[Elnora](https://elnora.ai) is an AI agent for biotech and pharma teams that generates, optimizes, and troubleshoots preclinical lab protocols. She learns from both successful and failed experiments, building knowledge that compounds with every project.

The CLI gives you full access to the platform from your terminal — collaborate with the agent, manage protocols and files, and integrate Elnora into your automation pipelines.

## What You Can Do

- **Generate and optimize protocols** — from iPSC differentiation to assay development, with citations from 36M+ PubMed articles and preprint servers
- **Access 2,100+ scientific tools** — protein structure prediction (AlphaFold3), molecular cloning design, glycan analysis, drug-target databases (ChEMBL, UniProt, Open Targets), and more
- **Stream agent responses in real-time** — pipe structured output directly into your scripts and workflows
- **Manage projects and files with version control** — track protocol iterations, fork and promote versions, search across your entire knowledge base
- **Run as an MCP server** — plug Elnora into Claude Code, Cursor, or any MCP-compatible AI tool as a first-class integration

## Requirements

- macOS, Linux, or Windows
- Node.js 20+ (npm install only — not required for curl/Homebrew)
- An Elnora API key — [get one here](https://platform.elnora.ai)

## Install

```bash
# macOS / Linux
curl -fsSL https://cli.elnora.ai/install.sh | bash

# Windows (PowerShell)
irm https://cli.elnora.ai/install.ps1 | iex

# npm (requires Node.js 20+)
npm install -g @elnora-ai/cli

# Homebrew
brew install elnora-ai/cli/elnora
```

## Skills & Setup

After installing the CLI, configure your AI coding tools:

```bash
elnora setup
```

This auto-detects which tools you have installed and configures them:

- **Claude Code** — registers the `elnora-plugins` marketplace and enables 9 skills (`elnora-tasks`, `elnora-projects`, `elnora-files`, etc.) so you can use natural language.
- **Cursor / VS Code / Codex** — writes an MCP server config pointing at `https://mcp.elnora.ai/mcp` with your API key.

Target a specific tool: `elnora setup claude` · `elnora setup cursor` · `elnora setup vscode` · `elnora setup codex`.

### What You Get in Claude Code

Once configured, restart Claude Code and try any natural-language request:

> "Use Elnora to generate a PCR protocol for BRCA1 exon 11"
> "Use Elnora to list my projects"
> "Use Elnora to optimize the protocol in task abc-123"

Claude will invoke the `elnora` CLI under the hood using the bundled skills. No need to memorize command syntax.

### Where Everything Lives

| What | Where |
|------|-------|
| CLI binary (macOS/Linux) | `~/.local/bin/elnora` |
| CLI binary (Windows) | `%USERPROFILE%\.elnora\bin\elnora.exe` |
| Auth / profiles | `~/.elnora/profiles.toml` (mode 0600) |
| Claude Code skills | `~/.claude/plugins/marketplaces/elnora-plugins/elnora/skills/` (auto-updated) |
| Claude Code settings | `~/.claude/settings.json` — look for `elnora@elnora-plugins: true` |

### Manual Plugin Setup

If `elnora setup claude` doesn't work for some reason, you can install the plugin manually:

1. In Claude Code, run `/plugin`
2. Choose "Add marketplace"
3. Enter: `Elnora-AI/elnora-plugins`
4. Run `/plugin` again → Plugins → Enable `elnora`

## Quick Start

```bash
elnora auth login
elnora projects list
elnora tasks create --project <id> --message "Analyze kinase inhibitors"
elnora tasks send <task-id> --message "Focus on selectivity" --stream
```

## Commands

| Group | Commands |
|-------|----------|
| `auth` | login, logout, status, profiles, validate |
| `projects` | list, get, create, update, archive, members, add-member, update-role, remove-member, leave |
| `tasks` | list, get, create, send (--stream, --wait), messages, update, archive |
| `files` | list, get, content, create, upload, download, update, archive, versions, fork, promote, working-copy, commit |
| `orgs` | list, get, create, update, members, billing, invite, invitations, resend-invite, cancel-invite, delete |
| `folders` | list, create, rename, move, delete |
| `search` | tasks, files, all, file-content |
| `library` | files, folders, create-folder, rename-folder, delete-folder |
| `account` | get, update, agreements, accept-terms, delete, users |
| `api-keys` | create, list, revoke, get-policy, set-policy |
| `audit` | list |
| `feedback` | submit |
| `flags` | list, get, set |
| `health` | check |

### Utility Commands

```bash
elnora doctor              # Check API, auth, version, config
elnora whoami              # Show current profile and org
elnora open [page]         # Open platform in browser (docs, keys, billing)
elnora completion <shell>  # Generate shell completions (bash, zsh, fish)
elnora mcp serve           # Start built-in MCP server
```

## Streaming

Real-time agent responses directly in your terminal:

```bash
# Stream agent output as it generates
elnora tasks send <task-id> --message "Optimize this protocol" --stream

# Wait for the complete response (polling)
elnora tasks send <task-id> --message "Optimize this protocol" --wait
```

Status output (thinking, tool calls) goes to stderr. Content goes to stdout, so streaming is pipeable:

```bash
elnora tasks send <task-id> --message "Analyze this" --stream > response.txt
```

## MCP Server

The CLI includes a built-in MCP server that exposes all commands as tools:

```bash
# Start HTTP MCP server (for deployment)
elnora mcp serve --http

# Start stdio MCP server (for local MCP clients)
elnora mcp serve --stdio
```

Configure in Claude Code or Cursor:

```json
{
  "elnora": {
    "type": "http",
    "url": "https://mcp.elnora.ai/mcp"
  }
}
```

## Authentication

```bash
# Login with API key
elnora auth login

# Multi-org profiles
elnora auth login --profile university
elnora --profile university projects list

# Check status
elnora doctor
```

API keys are stored in `~/.elnora/profiles.toml` with secure file permissions (0600).

## Output Formats

By default the CLI prints a **human-readable table** in an interactive terminal and
**JSON when the output is piped or redirected** — so `elnora ... | jq` and scripts/agents
keep getting JSON automatically, with no flag required.

```bash
elnora projects list                    # table in a terminal, JSON when piped
elnora projects list | jq               # JSON (piped → machine format)
elnora projects list --json             # force JSON, even in a terminal
elnora projects list --output table     # force the human table
elnora projects list --md               # Markdown (great for agents/chat/docs)
elnora projects list --output csv       # CSV
elnora projects list --compact          # compact (single-line) JSON
elnora projects list --fields id,name   # field filtering (works with any format)
```

Other global flags: `--quiet` (suppress spinners and update notices), `--no-color`
(disable colored output; `NO_COLOR` is also honored).

Run `elnora config show` to print the resolved endpoints and active profile.

## Documentation

- [Migration Guide](MIGRATION.md) — migrating from the Python CLI
- [API Reference](https://docs.elnora.ai)
- [Platform](https://platform.elnora.ai)

## License

Apache-2.0
