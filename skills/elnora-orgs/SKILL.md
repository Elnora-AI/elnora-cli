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

### Set Default Organization

```bash
$CLI --compact orgs set-default <ORG_ID>
```

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

### List Pending Invitations

```bash
$CLI --compact orgs invitations <ORG_ID>
```

### Cancel Invitation

```bash
$CLI --compact orgs cancel-invite <ORG_ID> <INVITATION_ID>
# -> {"cancelled":true,"invitationId":"..."}
```

Both positional.

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

**Browse shared library:**

```bash
$CLI --compact library folders --org <ORG_ID>
$CLI --compact library files --org <ORG_ID>
```
