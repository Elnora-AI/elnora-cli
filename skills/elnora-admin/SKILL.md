---
name: elnora-admin
description: >
  This skill should be used when the user asks to "log in", "check auth", "create API key",
  "revoke API key", "check health", "submit feedback", "view audit log",
  "shell completions", "account details", "accept terms", "validate token", "elnora setup",
  "api key policy", "delete account", "list users", "feature flags", "legal documents",
  "set feature flag", "manage legal docs", "list profiles", "show profiles", "whoami",
  "run diagnostics", "open platform",
  or any task involving Elnora Platform authentication, administration, or diagnostics.
---

# Elnora Admin & Diagnostics

Authentication, API key management, account settings, health checks, audit logs, feedback, and shell completions.

## Invocation

```bash
CLI="elnora"
```

## Authentication

### Login

```bash
$CLI --compact auth login --api-key <KEY>
$CLI --compact auth login --api-key <KEY> --profile university
```

`--api-key` is required — there is no interactive prompt. Keys must start with `elnora_live_` and be 20+ characters. Saves to `~/.elnora/profiles.toml`.

Response: `{"profile":"default","verified":true,"configPath":"/Users/<you>/.elnora/profiles.toml"}`

### Check Auth Status

```bash
$CLI --compact auth status
# -> {"profile":"default","authenticated":true,"projectCount":N}
```

### Logout

```bash
$CLI --compact auth logout
$CLI --compact auth logout --all
```

Without `--all`, removes the current profile. With `--all`, removes all saved profiles from `profiles.toml`.

### List Profiles

```bash
$CLI --compact auth profiles
# -> {"profiles":[{"name":"default","apiKey":"elnora_live_...abcd"}]}
```

Shows all configured profiles with masked API keys.

### Validate Token

```bash
$CLI --compact auth validate
$CLI --compact auth validate --token <TOKEN>
```

Validates the current API key (or a specific token).

### Who Am I

```bash
$CLI whoami
$CLI --json whoami
```

Shows current profile, masked API key, and organization name.

## API Key Management

### Create API Key

```bash
$CLI --compact api-keys create --name "CI Pipeline"
$CLI --compact api-keys create --name "Agent Key" --scopes "read,write"
```

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

Destructive — confirm with user first.

### Get API Key Policy

```bash
$CLI --compact api-keys get-policy
# -> {"policy":"all_members"}
```

### Set API Key Policy

```bash
$CLI --compact api-keys set-policy --policy admins_only
$CLI --compact api-keys set-policy --policy all_members
```

Org admin/owner only. Values: `all_members` or `admins_only`.

## Account Management

### Get Account

```bash
$CLI --compact account get <USER_ID>
```

`<USER_ID>` is positional. Get user IDs from `account users`.

### Update Account

```bash
$CLI --compact account update <USER_ID> --first-name Jane --last-name Doe
```

Must provide at least one of `--first-name` or `--last-name`.

### List Agreements

```bash
$CLI --compact account agreements
```

### Accept Terms

```bash
$CLI --compact account accept-terms <DOCUMENT_VERSION_ID>
```

`<DOCUMENT_VERSION_ID>` is positional.

### Delete Account

```bash
$CLI --compact account delete
$CLI --compact account delete --yes
```

**DANGEROUS: Permanently deletes the user's account. Irreversible.**
Requires typing "DELETE" to confirm. Use `--yes` to skip (non-interactive/CI only).

### List Users (SystemAdmin)

```bash
$CLI --compact account users
$CLI --compact account users --state Active
$CLI --compact account users --state Deleted --ref-code ABC123
```

Optional filters: `--state` (Active, Pending, Deleted), `--ref-code`.

### Add Legal Document Version (SystemAdmin)

```bash
$CLI --compact account add-legal-doc --document-type TermsOfService --version "2.0" --content "Terms text..." --effective-date 2026-04-01
```

| Flag | Required | Notes |
|------|----------|-------|
| `--document-type` | Yes | e.g. TermsOfService, PrivacyPolicy |
| `--version` | Yes | Version string |
| `--content` | Yes | Document content |
| `--effective-date` | No | ISO 8601 date |

### Update Legal Document Version (SystemAdmin)

```bash
$CLI --compact account update-legal-doc <VERSION_ID> --content "Updated terms..."
$CLI --compact account update-legal-doc <VERSION_ID> --effective-date 2026-05-01
```

`<VERSION_ID>` is positional. Must provide at least one of `--content` or `--effective-date`.

### Delete Legal Document Version (SystemAdmin)

```bash
$CLI --compact account delete-legal-doc <VERSION_ID> --yes
```

`<VERSION_ID>` is positional. Requires confirmation unless `--yes`.

## Feature Flags (SystemAdmin)

### List Feature Flags

```bash
$CLI --compact flags list
```

### Get Feature Flag

```bash
$CLI --compact flags get --key enable-new-editor
```

`--key` is a required flag (not positional).

### Set Feature Flag

```bash
$CLI --compact flags set --key enable-new-editor --value true --yes
```

| Flag | Required | Notes |
|------|----------|-------|
| `--key` | Yes | Flag key name |
| `--value` | Yes | `true` or `false` |
| `--yes` | No | Skip confirmation prompt |

**WARNING: Affects ALL users on the platform.** Always use `--yes` in agent context.

## Health & Diagnostics

### Health Check

```bash
$CLI health
```

No auth required. Returns `{"status":"ok","timestamp":"..."}` on success. Exits 1 if unreachable (network error).

### Doctor

```bash
$CLI doctor
```

Runs diagnostic checks: API reachability, authentication, version currency, config permissions, AI server reachability.

### Open Platform

```bash
elnora open              # Opens platform (default)
elnora open docs         # Opens documentation
elnora open keys         # Opens API keys page
elnora open billing      # Opens billing page
elnora open github       # Opens GitHub repo
```

## Audit Log

```bash
$CLI --compact audit list --org <ORG_ID>
$CLI --compact audit list --org <ORG_ID> --action "project.created" --user-id <USER_ID>
$CLI --compact audit list --org <ORG_ID> --page 2 --page-size 50
```

`--org` is a required flag. Optional filters: `--action`, `--user-id`.

## Feedback

```bash
$CLI --compact feedback submit --title "Feature request" --description "Add batch export"
```

Both `--title` and `--description` are required.

## Shell Completions

```bash
elnora completion bash >> ~/.bashrc
elnora completion zsh >> ~/.zshrc
elnora completion fish > ~/.config/fish/completions/elnora.fish
```

## Agent Recipes

**Verify setup:**

```bash
$CLI health && $CLI --compact auth status
```

**Rotate an API key:**

```bash
$CLI --compact api-keys create --name "Replacement Key"
# Update .env with the new key, then:
$CLI --compact api-keys revoke <OLD_KEY_ID>
```
