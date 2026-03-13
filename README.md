# Elnora CLI

Command-line interface for the [Elnora](https://elnora.ai) bioprotocol optimization platform.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-%3E%3D3.10-blue.svg)](https://www.python.org/)

## What is Elnora?

Elnora is an AI-powered platform that helps researchers generate, optimize, and manage bioprotocols for wet-lab experiments. This CLI lets you interact with Elnora from your terminal or integrate it into scripts and automation pipelines.

## Quick Start

### Install

```bash
# Install with uv (recommended)
uv tool install elnora

# Or with pip
pip install elnora
```

### Authenticate

```bash
elnora auth login
```

This prompts for your API key (get one from [platform.elnora.ai](https://platform.elnora.ai) > Settings > API Keys), verifies it, and saves it to `~/.elnora/profiles.toml`.

Alternatively, set an environment variable:

```bash
export ELNORA_API_KEY=your_api_key
```

### Multi-Org Setup

If you belong to multiple organizations, save a separate API key per org as a named profile:

```bash
elnora auth login --profile university
elnora auth login --profile work

# Use a specific profile
elnora --profile university projects list

# List all profiles
elnora auth profiles
```

### Verify

```bash
elnora auth status
```

## Usage

### Projects

```bash
# List projects
elnora projects list

# Get a specific project
elnora projects get <PROJECT_ID>

# Create a project
elnora projects create --name "My Protocol Library"
```

### Tasks

```bash
# List all tasks
elnora tasks list

# List tasks in a project
elnora tasks list --project <PROJECT_ID>

# Create a task
elnora tasks create --project <PROJECT_ID> --title "Generate HEK 293 protocol"

# Send a message to a task
elnora tasks send <TASK_ID> --message "Optimize for 6-well plates"

# Get task messages
elnora tasks messages <TASK_ID>

# Update a task
elnora tasks update <TASK_ID> --status completed

# Archive a task
elnora tasks archive <TASK_ID>
```

### Files

```bash
# List files in a project
elnora files list --project <PROJECT_ID>

# Get file metadata
elnora files get <FILE_ID>

# Get file content
elnora files content <FILE_ID>

# Get file version history
elnora files versions <FILE_ID>
```

### Search

```bash
# Search tasks
elnora search tasks --query "HEK 293"

# Search files
elnora search files --query "transfection protocol"
```

### Health Check

```bash
# Check if the Elnora platform is reachable
elnora health
```

## Global Options

| Option | Description |
|--------|-------------|
| `--profile` | Named profile to use (default: `default`) |
| `--compact` | Token-efficient minimal JSON output |
| `--output json\|csv` | Output format (default: `json`) |
| `--fields` | Comma-separated fields to include in output |
| `--version` | Show version |
| `--help` | Show help |

### Examples

```bash
# Compact JSON for piping
elnora --compact projects list

# CSV output
elnora --output csv tasks list

# Select specific fields
elnora --fields "id,name,createdAt" projects list

# Combine options
elnora --output csv --fields "id,title,status" tasks list --project <ID>
```

## Shell Completions

```bash
# Bash
elnora completion bash >> ~/.bashrc

# Zsh
elnora completion zsh >> ~/.zshrc

# Fish
elnora completion fish > ~/.config/fish/completions/elnora.fish
```

## Output Format

All commands output structured JSON to stdout on success and structured JSON errors to stderr on failure.

**Success** (exit 0):
```json
{
  "items": [...],
  "totalCount": 42,
  "page": 1,
  "pageSize": 25
}
```

**Error** (typed exit codes):
```json
{
  "error": "Invalid project_id: 'abc'. Expected UUID format.",
  "code": "VALIDATION_ERROR",
  "suggestion": "Run: elnora projects list"
}
```

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | General / unexpected error |
| 2 | Validation error (bad input) |
| 3 | Authentication error |
| 4 | Not found |
| 5 | Rate limited |
| 6 | Server error |

This makes the CLI easy to integrate with `jq`, scripts, and AI agents.

## Authentication

The CLI resolves API keys in this order:

1. `ELNORA_API_KEY` environment variable
2. `ELNORA_MCP_API_KEY` environment variable (alias)
3. `.env` file in the nearest project root (directory containing `pyproject.toml`, `package.json`, `.git`, etc.)
4. `~/.elnora/profiles.toml` — active profile (selected by `--profile` flag or `ELNORA_PROFILE` env var, default: `default`)
5. `~/.elnora/config.toml` (legacy fallback)

Existing `config.toml` credentials are automatically migrated to `profiles.toml` on first use.

**Security best practices:**
- Never commit API keys to version control
- Use `elnora auth login` (saves to `~/.elnora/profiles.toml` with 600 permissions)
- Or use environment variables / a gitignored `.env` file
- Rotate keys periodically via the Elnora dashboard
- Run `elnora auth logout` to remove saved credentials

## Development

```bash
# Clone the repo
git clone https://github.com/Elnora-AI/elnora-cli.git
cd elnora-cli

# Install in development mode
uv sync

# Run the CLI
uv run elnora --help

# Run tests
uv run pytest
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `AUTH_FAILED` | Missing or invalid API key | Run `elnora auth login` or set `ELNORA_API_KEY` env var |
| `VALIDATION_ERROR` | Invalid UUID format | Check the ID — use `elnora <resource> list` to find valid IDs |
| `NOT_FOUND` | Resource doesn't exist | Verify the ID with `elnora <resource> list` |
| `RATE_LIMITED` | Too many requests | Wait a moment and retry |
| `NETWORK_ERROR` | Can't reach Elnora API | Check your internet connection |
| `SERVER_ERROR` | Elnora API issue | Try again later; contact support@elnora.ai if persistent |

## Claude Code Plugin

This package includes a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) with built-in skills that teach Claude how to use every CLI command. Skills are bundled with the package — no separate installation needed.

When Claude Code detects the Elnora CLI, it automatically gets access to command syntax, pagination patterns, error handling, and agent-optimized recipes.

### Example

Tell Claude: *"Create a new Elnora project called PCR Library and generate a BRCA1 protocol"*

Claude will run the right sequence of CLI commands automatically.

## Related

- [Elnora MCP Server](https://github.com/Elnora-AI/elnora-mcp-server) — Connect AI agents to Elnora via the Model Context Protocol
- [Elnora Platform](https://platform.elnora.ai) — Web application

## Security

We take security seriously. If you discover a vulnerability, please report it responsibly — see our [security policy](.github/SECURITY.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Support

- **Bug reports and feature requests:** [GitHub Issues](https://github.com/Elnora-AI/elnora-cli/issues)
- **Account and billing questions:** [support@elnora.ai](mailto:support@elnora.ai)
- **Security vulnerabilities:** [security@elnora.ai](mailto:security@elnora.ai)
