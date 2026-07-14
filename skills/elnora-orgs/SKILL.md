---
name: elnora-orgs
description: >
  This skill should be used when the user asks to "list organizations", "create org",
  "org members", "billing", "invite member", "manage invitations", "list invitations",
  "resend invitation", "reinvite", "cancel invitation", "accept invitation",
  "get invitation info", "remove member from org", "organization library",
  "shared library", "library files", "library folders", "set default org",
  "delete org", "list all orgs", "set stripe", "search members", "member directory",
  "find a member", "look up a user id to share with", "auto-tidy", "set auto-tidy",
  or any task involving Elnora Platform organization management and shared library resources.
---

# Elnora Organizations & Library

Manage organizations, members, billing, invitations, and the shared organization library.

## Tool Access

Elnora is available via two methods. Use whichever is configured.

**Option A — CLI via Bash (preferred)**

Run commands via your Bash/Shell tool as `elnora <group> <action> ...`. Verify with `elnora --version`. CLI uses ~5× fewer tokens than MCP.

**Option B — MCP tools (when CLI isn't installed)**

Look for tools prefixed `mcp__elnora__` in your available tools. Call them with structured parameters (camelCase — e.g. `projectId`, not `project-id`). See the "MCP Tool Names" table below for the mapping.

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

## Organization Commands

### List Organizations

```bash
$CLI --compact orgs list
```

### Get Organization

```bash
$CLI --compact orgs get <ORG_ID>
```

### Create Organization

```bash
$CLI --compact orgs create --name "Elnora Bio Lab"
$CLI --compact orgs create --name "Elnora Bio Lab" --description "Main research org"
```

### Update Organization

```bash
$CLI --compact orgs update <ORG_ID> --name "New Name"
$CLI --compact orgs update <ORG_ID> --description "Updated description"
```

Must provide at least one of `--name` or `--description`.

### List Members

```bash
$CLI --compact orgs members <ORG_ID>
```

### Update Member Role

```bash
$CLI --compact orgs update-role <ORG_ID> <MEMBERSHIP_ID> --role Admin
```

Both positional. `--role` is required. Uses the **membership ID** (not user ID) — get it from `orgs members`.

### Remove Member

```bash
$CLI --compact orgs remove-member <ORG_ID> <MEMBERSHIP_ID>
# -> {"removed":true}
```

Both positional. Destructive — confirm with user first.

### Get Billing

```bash
$CLI --compact orgs billing <ORG_ID>
```

### List Org Files (Admin Compliance View)

```bash
$CLI --compact orgs files <ORG_ID>
$CLI --compact orgs files <ORG_ID> --page 2 --page-size 50
```

`<ORG_ID>` is positional (`orgId`). Lists all files across all projects in the organization.

### Search Member Directory

```bash
$CLI --compact orgs directory <ORG_ID> --query "ada"
```

Look up fellow organization members by name or email substring — this is how you find the numeric `userId` needed by `files share` / `folders share`. `<ORG_ID>` is positional; `--query` needs at least 2 characters. Any member can use it.

### Set Default Organization

```bash
$CLI --compact orgs set-default <ORG_ID>
```

### Set Knowledge Base Auto-Tidy

```bash
$CLI --compact orgs set-autotidy <ORG_ID> --enabled   # turn on
$CLI --compact orgs set-autotidy <ORG_ID>             # turn off (omit --enabled)
```

Toggles KB auto-tidy for the org. When on, the agent proposes folder/file tidy-ups that land in the review queue (see the `elnora-review` skill).

### Set Stripe Customer ID (SystemAdmin)

```bash
$CLI --compact orgs set-stripe <ORG_ID> <CUSTOMER_ID>
```

Both positional. Example: `elnora --compact orgs set-stripe <ORG_ID> cus_xxx`

### List All Organizations (SystemAdmin)

```bash
$CLI --compact orgs list-all
```

### Delete Organization

```bash
$CLI --compact orgs delete <ORG_ID>
$CLI --compact orgs delete <ORG_ID> --yes
# -> {"deleted":true,"orgId":"<UUID>"}
```

**DANGEROUS.** Requires y/N confirmation. Use `--yes` to skip (non-interactive/CI only).

## Invitation Commands

### Send Invitation

```bash
$CLI --compact orgs invite <ORG_ID> --email user@example.com
$CLI --compact orgs invite <ORG_ID> --email user@example.com --role Admin
```

**Smart upsert:** if an invitation already exists for this email (pending *or*
expired), `orgs invite` routes to the resend endpoint automatically — you don't
need to cancel first, and the invitation ID stays stable across resends.

### List Invitations

```bash
$CLI --compact orgs invitations <ORG_ID>
```

Returns all unaccepted invitations, both **pending** and **expired**. Use the
`isExpired` field on each item to distinguish them. Accepted invitations are
excluded (they're members now).

### Resend Invitation

```bash
$CLI --compact orgs resend-invite <ORG_ID> <INVITATION_ID>
```

Regenerates the invitation token, extends the expiry by 7 days, and re-sends
the invitation email. Works on both pending and expired invitations. Preserves
the invitation ID so external references remain valid.

Both positional. Prefer this command when you already have an invitation ID;
use `orgs invite` by email when you don't.

### Cancel Invitation

```bash
$CLI --compact orgs cancel-invite <ORG_ID> <INVITATION_ID>
# -> {"cancelled":true,"invitationId":"..."}
```

Both positional. Works on pending or expired invitations (any unaccepted row).

### Get Invitation Info (by token)

```bash
$CLI --compact orgs invitation-info --token <TOKEN>
```

`--token` is a flag (not positional — `token` doesn't end in "Id").

### Accept Invitation

```bash
$CLI --compact orgs accept-invite --token <TOKEN>
```

`--token` is a flag.

## Organization Library Commands

The organization library holds shared files and folders accessible to all org members.

### List Library Files

```bash
$CLI --compact library files --org <ORG_ID>
$CLI --compact library files --org <ORG_ID> --page 2 --page-size 50
```

`--org` is a flag (`org` doesn't end in "Id").

### List Library Folders

```bash
$CLI --compact library folders --org <ORG_ID>
```

### Create Library Folder

```bash
$CLI --compact library create-folder --org <ORG_ID> --name "Shared Protocols"
$CLI --compact library create-folder --org <ORG_ID> --name "Sub Folder" --parent <PARENT_FOLDER_ID>
```

### Rename Library Folder

```bash
$CLI --compact library rename-folder --org <ORG_ID> <FOLDER_ID> --name "New Name"
```

`<FOLDER_ID>` is positional (`folderId`). `--org` and `--name` are flags.

### Delete Library Folder

```bash
$CLI --compact library delete-folder --org <ORG_ID> <FOLDER_ID>
# -> {"deleted":true,"folderId":"..."}
```

Destructive — confirm with user first.

## MCP Tool Names

| CLI command | MCP tool name |
|-------------|---------------|
| `orgs list` | `elnora_orgs_list` |
| `orgs get` | `elnora_orgs_get` |
| `orgs create` | `elnora_orgs_create` |
| `orgs update` | `elnora_orgs_update` |
| `orgs members` | `elnora_orgs_members` |
| `orgs update-role` | `elnora_orgs_updateRole` |
| `orgs remove-member` | `elnora_orgs_removeMember` |
| `orgs billing` | `elnora_orgs_billing` |
| `orgs files` | `elnora_orgs_files` |
| `orgs directory` | `elnora_orgs_directory` |
| `orgs set-autotidy` | `elnora_orgs_setAutotidy` |
| `orgs set-default` | `elnora_orgs_setDefault` |
| `orgs set-stripe` | `elnora_orgs_setStripe` |
| `orgs list-all` | `elnora_orgs_listAll` |
| `orgs delete` | `elnora_orgs_delete` |
| `orgs invite` | `elnora_orgs_invite` |
| `orgs invitations` | `elnora_orgs_invitations` |
| `orgs resend-invite` | `elnora_orgs_resendInvite` |
| `orgs cancel-invite` | `elnora_orgs_cancelInvite` |
| `orgs invitation-info` | `elnora_orgs_invitationInfo` |
| `orgs accept-invite` | `elnora_orgs_acceptInvite` |
| `library files` | `elnora_library_files` |
| `library folders` | `elnora_library_folders` |
| `library create-folder` | `elnora_library_createFolder` |
| `library rename-folder` | `elnora_library_renameFolder` |
| `library delete-folder` | `elnora_library_deleteFolder` |

## Agent Recipes

**Get org ID, then check billing:**

```bash
ORG=$($CLI --compact orgs list | jq -r 'if type == "array" then .[0].id else .items[0].id end')
$CLI --compact orgs billing "$ORG"
```

**Invite a team member:**

```bash
$CLI --compact orgs invite <ORG_ID> --email new.researcher@lab.com --role Member
```

**Resend a stalled or expired invitation (by email):**

```bash
# orgs invite is idempotent — if the email has any unaccepted invitation
# (pending or expired), it automatically resends instead of creating a new one.
$CLI --compact orgs invite <ORG_ID> --email new.researcher@lab.com
```

**Resend a specific invitation by ID:**

```bash
# 1. List invitations to find the ID (includes expired rows)
$CLI --compact orgs invitations <ORG_ID>
# 2. Resend the specific one
$CLI --compact orgs resend-invite <ORG_ID> <INVITATION_ID>
```

**Browse shared library:**

```bash
$CLI --compact library folders --org <ORG_ID>
$CLI --compact library files --org <ORG_ID>
```
