---
name: elnora-admin
description: >
  This skill should be used when the user asks to "log in", "check auth", "create API key",
  "revoke API key", "check health", "submit feedback", "view audit log", "feature flags",
  "shell completions", "account details", "accept terms", "validate token", "elnora setup",
  or any task involving Elnora Platform authentication, administration, or diagnostics.
---

# Elnora Admin & Diagnostics

Authentication, API key management, account settings, health checks, feature flags, audit logs, feedback, and shell completions.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

## Authentication

### Login

```bash
$CLI auth login
$CLI --compact auth login --api-key <KEY>
```

Interactive login prompts for the API key and saves to `~/.elnora/config.toml`. The `--api-key` flag is insecure (visible in process listings) -- prefer interactive prompt or env var.

Keys must start with `elnora_live_` and be 20+ characters.

### Check Auth Status

```bash
$CLI --compact auth status
# -> {"authenticated":true,"totalProjects":N}
```

Quick way to verify the CLI is properly configured.

### Logout

```bash
$CLI --compact auth logout
# -> {"loggedOut":true,"removed":"~/.elnora/config.toml"}
```

Removes saved credentials from disk.

### Validate Token

```bash
$CLI --compact auth validate
$CLI --compact auth validate --token <TOKEN>
```

Validates the current API key (or a specific token). Useful for debugging auth issues.

## API Key Management

### Create API Key

```bash
$CLI --compact api-keys create --name "CI Pipeline"
$CLI --compact api-keys create --name "Agent Key" --scopes "read,write"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--name` | Yes | Key name for identification |
| `--scopes` | No | Comma-separated scope list |

**IMPORTANT:** The key value is only shown once in the response. Store it securely.

### List API Keys

```bash
$CLI --compact api-keys list
```

### Revoke API Key

```bash
$CLI --compact api-keys revoke <KEY_ID>
# -> {"revoked":true,"keyId":"..."}
```

Destructive -- confirm with user first.

## Account Management

### Get Account

```bash
$CLI --compact account get <USER_ID>
```

Returns account details for a user ID (integer).

### Update Account

```bash
$CLI --compact account update <USER_ID> --first-name Jane --last-name Doe
```

Must provide at least one of `--first-name` or `--last-name`.

### List Agreements

```bash
$CLI --compact account agreements
```

Lists all terms/agreement documents.

### Accept Terms

```bash
$CLI --compact account accept-terms --document-version-id <VERSION_ID>
```

`--document-version-id` is required (integer).

## Health Check

```bash
$CLI health
```

No auth required. Checks if the Elnora platform is reachable. Returns `{"status":"ok","httpStatus":200}` on success. Exits 6 if unhealthy or unreachable.

## Feature Flags

No auth required.

```bash
# List all flags
$CLI --compact flags list

# Get a specific flag
$CLI --compact flags get <FLAG_KEY>
```

## Audit Log

```bash
$CLI --compact audit list --org <ORG_ID>
$CLI --compact audit list --org <ORG_ID> --action "project.created" --user-id <USER_ID>
$CLI --compact audit list --org <ORG_ID> --page 2 --page-size 50
```

`--org` is required. Optional filters: `--action`, `--user-id`.

## Feedback

```bash
$CLI --compact feedback submit --title "Feature request" --description "Add batch export"
```

Both `--title` and `--description` are required. Creates a Linear issue for the Elnora team.

## Shell Completions

```bash
elnora completion bash >> ~/.bashrc
elnora completion zsh >> ~/.zshrc
elnora completion fish > ~/.config/fish/completions/elnora.fish
elnora completion powershell >> $PROFILE
```

Generates shell-specific completion scripts. Run once during setup.

## Agent Recipes

**Verify setup is working:**

```bash
$CLI health && $CLI --compact auth status
```

**Rotate an API key:**

```bash
# 1. Create new key
$CLI --compact api-keys create --name "Replacement Key"
# 2. Update .env with the new key
# 3. Verify
$CLI --compact auth status
# 4. Revoke old key
$CLI --compact api-keys revoke <OLD_KEY_ID>
```

**Check audit trail for an org:**

```bash
ORG=$($CLI --compact orgs list | jq -r '.[0].id')
$CLI --compact audit list --org "$ORG" --page-size 50
```
