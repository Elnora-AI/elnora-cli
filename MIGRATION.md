# Migrating from Python CLI to TypeScript CLI

## What Changed

The Elnora CLI has been rewritten from Python to TypeScript for faster startup,
standalone binary distribution, and unified MCP server support.

## What Didn't Change

- **Same command names and flags** — drop-in replacement
- **Same profile format** — `~/.elnora/profiles.toml` works without changes
- **Same exit codes** — scripts checking `$?` still work
- **Same JSON output** — piped workflows still work

## New Installation

### Remove Python CLI

```bash
pip uninstall elnora
# or
uv tool uninstall elnora
```

### Install TypeScript CLI (pick one)

```bash
curl -fsSL https://cli.elnora.ai/install.sh | bash          # macOS/Linux
irm https://cli.elnora.ai/install.ps1 | iex                  # Windows
npm install -g @elnora-ai/cli                                    # npm
brew install elnora-ai/cli/elnora                             # Homebrew
```

## New Features

- `elnora tasks send --stream` — real-time agent response streaming
- `elnora tasks send --wait` — wait for agent response (polling)
- `elnora doctor` — unified diagnostic
- `elnora whoami` — show current auth context
- `elnora open` — open platform in browser
- `elnora mcp serve` — built-in MCP server (replaces elnora-mcp-server)
- `elnora completion bash|zsh|fish` — shell completions

## Verify

```bash
elnora doctor
```
