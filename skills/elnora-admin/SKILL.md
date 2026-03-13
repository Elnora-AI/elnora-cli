---
name: elnora-admin
description: >
  This skill should be used when the user asks to "log in", "check auth", "create API key",
  "revoke API key", "check health", "submit feedback", "view audit log",
  "shell completions", "account details", "accept terms", "validate token", "elnora setup",
  "api key policy", "delete account", "list users", "feature flags", "legal documents",
  "set feature flag", "manage legal docs", "list profiles", "show profiles",
  or any task involving Elnora Platform authentication, administration, or diagnostics.
---

# Elnora Admin & Diagnostics

Authentication, API key management, account settings, health checks, audit logs, feedback, and shell completions.

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

Interactive login prompts for the API key and saves to `~/.elnora/profiles.toml`. The `--api-key` flag is insecure (visible in process listings) -- prefer interactive prompt or env var.

Keys must start with `elnora_live_` and be 20+ characters.

Response: `{"authenticated":true,"profile":"<name>","configPath":"/Users/<you>/.elnora/profiles.toml","totalProjects":N}`

### Check Auth Status

```bash
$CLI --compact auth status
# -> {"authenticated":true,"profile":"default","totalProjects":N}
```

Quick way to verify the CLI is properly configured.

### Logout

```bash
$CLI --compact auth logout
# -> {"loggedOut":true,"profile":"default","message":"Profile 'default' removed."}

$CLI --compact auth logout --all
# -> {"loggedOut":true,"removed":"/Users/<you>/.elnora/profiles.toml","message":"All profiles removed."}
```

Removes saved credentials from disk. Without `--all`, removes the current profile only. With `--all`, deletes the entire `profiles.toml` file.

If the profile doesn't exist, exits 0 with `"message":"Profile '<name>' not found."`.

### List Profiles

```bash
$CLI --compact auth profiles
# -> {"profiles":[{"name":"default","apiKey":"elnora_live_...abcd"},{"name":"university","apiKey":"elnora_live_...wxyz"}]}
```

Shows all configured profiles with masked API keys. Useful for verifying multi-org setup.

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

### Get API Key Policy

```bash
$CLI --compact api-keys get-policy
# -> {"policy":"all_members"}
```

Shows whether all org members or only admins can create API keys.

### Set API Key Policy

```bash
$CLI --compact api-keys set-policy --policy admins_only
$CLI --compact api-keys set-policy --policy all_members
# -> {"updated":true,"policy":"admins_only"}
```

Org admin/owner only. Values: `all_members` or `admins_only`.

## Account Management

### Get Account

```bash
$CLI --compact account get <USER_ID>
```

Returns account details. **`<USER_ID>` is an integer (e.g. `42`), NOT a UUID.** Get user IDs from `account users`.

### Update Account

```bash
$CLI --compact account update <USER_ID> --first-name Jane --last-name Doe
```

**`<USER_ID>` is an integer, not a UUID.** Must provide at least one of `--first-name` or `--last-name`.

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

### Delete Account

```bash
$CLI --compact account delete
$CLI --compact account delete --yes
# -> {"deleted":true,"account":"current user"}
```

**DANGEROUS: Permanently deletes the user's account and all associated data. Irreversible.**
Requires typing "DELETE" to confirm. Use `--yes` to skip (non-interactive/CI only).

### List Users (SystemAdmin)

```bash
$CLI --compact account users
$CLI --compact account users --state Active
$CLI --compact account users --state Deleted --ref-code ABC123
```

SystemAdmin only. Optional filters: `--state` (Active, Pending, Deleted), `--ref-code`.

### Add Legal Document Version (SystemAdmin)

```bash
$CLI --compact account add-legal-doc --document-type TermsOfService --version "2.0" --content "Terms text..." --effective-date 2026-04-01
```

| Flag | Required | Notes |
|------|----------|-------|
| `--document-type` | Yes | e.g. TermsOfService, PrivacyPolicy |
| `--version` | Yes | Version string (e.g. "1.0") |
| `--content` | Yes | Document content (text/markdown) |
| `--effective-date` | No | ISO 8601 date |

### Update Legal Document Version (SystemAdmin)

```bash
$CLI --compact account update-legal-doc <VERSION_ID> --content "Updated terms..."
$CLI --compact account update-legal-doc <VERSION_ID> --effective-date 2026-05-01
```

Must provide at least one of `--content` or `--effective-date`.

### Delete Legal Document Version (SystemAdmin)

```bash
$CLI --compact account delete-legal-doc <VERSION_ID>
$CLI --compact account delete-legal-doc <VERSION_ID> --yes
# -> {"deleted":true,"documentVersionId":N}
```

**DANGEROUS: Permanently deletes the legal document version. Irreversible.**
Requires typing "DELETE" to confirm. Use `--yes` to skip.

## Feature Flags (SystemAdmin)

### List Feature Flags

```bash
$CLI --compact flags list
```

Returns all global feature flags with key, name, description, and value.

### Get Feature Flag

```bash
$CLI --compact flags get <KEY>
# -> {"key":"enable-new-editor","value":true}
```

### Set Feature Flag

```bash
$CLI --compact flags set enable-new-editor true
$CLI --compact flags set enable-new-editor false --yes
# -> {"updated":true,"key":"enable-new-editor","value":true}
```

**WARNING: Affects ALL users on the platform.** Without `--yes`, blocks on an interactive yes/no prompt. Always use `--yes` in agent context.

## Health Check

```bash
$CLI health
```

No auth required. Checks if the Elnora platform is reachable. Returns `{"status":"ok","httpStatus":200}` on success. Exits 6 if unhealthy or unreachable.

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
ORG=$($CLI --compact orgs list | jq -r '.items[0].id')
$CLI --compact audit list --org "$ORG" --page-size 50
```
