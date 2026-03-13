---
name: elnora-orgs
description: >
  This skill should be used when the user asks to "list organizations", "create org",
  "org members", "billing", "invite member", "manage invitations", "organization library",
  "shared library", "library files", "library folders", "set default org", "delete org",
  "list all orgs", "set stripe",
  or any task involving Elnora Platform organization management and shared library resources.
---

# Elnora Organizations & Library

Manage organizations, members, billing, invitations, and the shared organization library.

## Invocation

```
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
```

## Organization Commands

### List Organizations

```bash
$CLI --compact orgs list
```

Lists all organizations the current user belongs to.

### Get Organization

```bash
$CLI --compact orgs get <ORG_ID>
```

Returns organization details by ID.

### Create Organization

```bash
$CLI --compact orgs create --name "Elnora Bio Lab"
$CLI --compact orgs create --name "Elnora Bio Lab" --description "Main research org"
```

| Flag | Required | Notes |
|------|----------|-------|
| `--name` | Yes | Organization name |
| `--description` | No | Organization description |

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

`--role` is required. Uses the membership ID (not user ID).

### Remove Member

```bash
$CLI --compact orgs remove-member <ORG_ID> <MEMBERSHIP_ID>
# -> {"deleted":true,"membershipId":"...","orgId":"..."}
```

Destructive -- confirm with user first.

### Get Billing

```bash
$CLI --compact orgs billing <ORG_ID>
```

Returns billing information for the organization.

### List All Org Files (Admin Compliance View)

```bash
$CLI --compact orgs files --org <ORG_ID>
$CLI --compact orgs files --org <ORG_ID> --page 2 --page-size 50
```

`--org` is required. Lists all files across all projects in the organization. Useful for admin compliance and auditing.

### Set Default Organization

```bash
$CLI --compact orgs set-default <ORG_ID>
# -> {"updated":true,"defaultOrgId":"<UUID>"}
```

Sets the specified organization as your default. Used when no `--profile` is specified.

### Set Stripe Customer ID (SystemAdmin)

```bash
$CLI --compact orgs set-stripe <ORG_ID> --customer-id cus_xxx
```

SystemAdmin only. Sets the Stripe billing customer ID for an organization.

### List All Organizations (SystemAdmin)

```bash
$CLI --compact orgs list-all
```

SystemAdmin only. Lists ALL organizations on the platform (not just the user's).

### Delete Organization (SystemAdmin)

```bash
$CLI --compact orgs delete <ORG_ID>
$CLI --compact orgs delete <ORG_ID> --yes
# -> {"deleted":true,"orgId":"<UUID>"}
```

**DANGEROUS: Permanently deletes the organization and ALL its data. Irreversible.**
Requires typing the organization name to confirm. Use `--yes` to skip (non-interactive/CI only).

## Invitation Commands

### Send Invitation

```bash
$CLI --compact orgs invite <ORG_ID> --email user@example.com
$CLI --compact orgs invite <ORG_ID> --email user@example.com --role Admin
```

| Flag | Required | Notes |
|------|----------|-------|
| `--email` | Yes | Email to invite |
| `--role` | No | Role for invitee (default: "Member") |

### List Pending Invitations

```bash
$CLI --compact orgs invitations <ORG_ID>
```

### Cancel Invitation

```bash
$CLI --compact orgs cancel-invite <ORG_ID> <INVITATION_ID>
# -> {"deleted":true,"invitationId":"...","orgId":"..."}
```

### Get Invitation Info (by token)

```bash
$CLI --compact orgs invitation-info <TOKEN>
```

Returns details about an invitation using its token string.

### Accept Invitation

```bash
$CLI --compact orgs accept-invite <TOKEN>
```

Accepts an invitation using its token.

## Organization Library Commands

The organization library holds shared files and folders accessible to all org members.

### List Library Files

```bash
$CLI --compact library files --org <ORG_ID>
$CLI --compact library files --org <ORG_ID> --page 2 --page-size 50
```

`--org` is required.

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

### Delete Library Folder

```bash
$CLI --compact library delete-folder --org <ORG_ID> <FOLDER_ID>
# -> {"deleted":true,"folderId":"..."}
```

Destructive -- confirm with user first.

## Agent Recipes

**Get org ID, then check billing:**

```bash
ORG=$($CLI --compact orgs list | jq -r 'if type == "array" then .[0].id else .items[0].id end')
$CLI --compact orgs billing "$ORG"
```

**Invite a new team member:**

```bash
$CLI --compact orgs invite <ORG_ID> --email new.researcher@lab.com --role Member
```

**Browse shared library:**

```bash
# List folders, then list files
$CLI --compact library folders --org <ORG_ID>
$CLI --compact library files --org <ORG_ID>
```
