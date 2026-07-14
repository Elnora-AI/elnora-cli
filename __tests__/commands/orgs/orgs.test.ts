import { describe, expect, test, vi } from "vitest";
import { orgsAcceptInvite } from "../../../src/commands/orgs/accept-invite.js";
import { orgsBilling } from "../../../src/commands/orgs/billing.js";
import { orgsCancelInvite } from "../../../src/commands/orgs/cancel-invite.js";
import { orgsCreate } from "../../../src/commands/orgs/create.js";
import { orgsDelete } from "../../../src/commands/orgs/delete.js";
import { orgsDirectory } from "../../../src/commands/orgs/directory.js";
import { orgsFiles } from "../../../src/commands/orgs/files.js";
import { orgsGet } from "../../../src/commands/orgs/get.js";
import { registerOrgCommands } from "../../../src/commands/orgs/index.js";
import { orgsInvitationInfo } from "../../../src/commands/orgs/invitation-info.js";
import { orgsInvitations } from "../../../src/commands/orgs/invitations.js";
import { orgsInvite } from "../../../src/commands/orgs/invite.js";
import { orgsList } from "../../../src/commands/orgs/list.js";
import { orgsListAll } from "../../../src/commands/orgs/list-all.js";
import { orgsMembers } from "../../../src/commands/orgs/members.js";
import { orgsRemoveMember } from "../../../src/commands/orgs/remove-member.js";
import { orgsResendInvite } from "../../../src/commands/orgs/resend-invite.js";
import { orgsSetAutotidy } from "../../../src/commands/orgs/set-autotidy.js";
import { orgsSetDefault } from "../../../src/commands/orgs/set-default.js";
import { orgsSetStripe } from "../../../src/commands/orgs/set-stripe.js";
import { orgsUpdate } from "../../../src/commands/orgs/update.js";
import { orgsUpdateRole } from "../../../src/commands/orgs/update-role.js";
import type { CommandContext } from "../../../src/core/command.js";
import { ValidationError } from "../../../src/lib/errors.js";

const ORG_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const MEMBER_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";
const INVITE_ID = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";

function mockContext(overrides?: {
	getResult?: unknown;
	postResult?: unknown;
	patchResult?: unknown;
	putResult?: unknown;
	delResult?: unknown;
}): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? {}),
			post: vi.fn().mockResolvedValue(overrides?.postResult ?? {}),
			patch: vi.fn().mockResolvedValue(overrides?.patchResult ?? {}),
			put: vi.fn().mockResolvedValue(overrides?.putResult ?? {}),
			del: vi.fn().mockResolvedValue(overrides?.delResult ?? undefined),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

// ---------------------------------------------------------------------------
// orgs.list
// ---------------------------------------------------------------------------

describe("orgs.list", () => {
	test("has correct name and group", () => {
		expect(orgsList.name).toBe("orgs.list");
		expect(orgsList.group).toBe("orgs");
	});

	test("has readOnlyHint annotation", () => {
		expect(orgsList.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /organizations", async () => {
		const ctx = mockContext({ getResult: [{ id: ORG_ID }] });
		const result = await orgsList.execute({}, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("organizations");
		expect(result).toEqual([{ id: ORG_ID }]);
	});
});

// ---------------------------------------------------------------------------
// orgs.get
// ---------------------------------------------------------------------------

describe("orgs.get", () => {
	test("has correct name and group", () => {
		expect(orgsGet.name).toBe("orgs.get");
		expect(orgsGet.group).toBe("orgs");
	});

	test("requires a valid UUID orgId", () => {
		expect(() => orgsGet.inputSchema.parse({})).toThrow();
		expect(() => orgsGet.inputSchema.parse({ orgId: "not-uuid" })).toThrow();
		expect(orgsGet.inputSchema.parse({ orgId: ORG_ID })).toEqual({ orgId: ORG_ID });
	});

	test("calls GET /organizations/{id}", async () => {
		const ctx = mockContext({ getResult: { id: ORG_ID, name: "Test Org" } });
		const result = await orgsGet.execute({ orgId: ORG_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("organization", {
			pathParams: { id: ORG_ID },
		});
		expect(result).toEqual({ id: ORG_ID, name: "Test Org" });
	});
});

// ---------------------------------------------------------------------------
// orgs.create
// ---------------------------------------------------------------------------

describe("orgs.create", () => {
	test("has correct name and group", () => {
		expect(orgsCreate.name).toBe("orgs.create");
		expect(orgsCreate.group).toBe("orgs");
	});

	test("requires name, optional description", () => {
		expect(() => orgsCreate.inputSchema.parse({})).toThrow();
		expect(orgsCreate.inputSchema.parse({ name: "My Org" })).toEqual({ name: "My Org" });
		expect(orgsCreate.inputSchema.parse({ name: "O", description: "Desc" })).toEqual({
			name: "O",
			description: "Desc",
		});
	});

	test("calls POST /organizations", async () => {
		const ctx = mockContext({ postResult: { id: ORG_ID, name: "New Org" } });
		const result = await orgsCreate.execute({ name: "New Org" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("organizations", { name: "New Org" });
		expect(result).toEqual({ id: ORG_ID, name: "New Org" });
	});
});

// ---------------------------------------------------------------------------
// orgs.update
// ---------------------------------------------------------------------------

describe("orgs.update", () => {
	test("has correct name and group", () => {
		expect(orgsUpdate.name).toBe("orgs.update");
		expect(orgsUpdate.group).toBe("orgs");
	});

	test("throws ValidationError when no fields provided", async () => {
		const ctx = mockContext();
		await expect(orgsUpdate.execute({ orgId: ORG_ID }, ctx)).rejects.toThrow(ValidationError);
	});

	test("calls PATCH /organizations/{id} with fields", async () => {
		const ctx = mockContext({ patchResult: { id: ORG_ID, name: "Updated" } });
		const result = await orgsUpdate.execute({ orgId: ORG_ID, name: "Updated" }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith("organization", { name: "Updated" }, { pathParams: { id: ORG_ID } });
		expect(result).toEqual({ id: ORG_ID, name: "Updated" });
	});
});

// ---------------------------------------------------------------------------
// orgs.delete
// ---------------------------------------------------------------------------

describe("orgs.delete", () => {
	test("has correct name and group", () => {
		expect(orgsDelete.name).toBe("orgs.delete");
		expect(orgsDelete.group).toBe("orgs");
	});

	test("has destructiveHint annotation", () => {
		expect(orgsDelete.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /organizations/{id} when --yes is true", async () => {
		const ctx = mockContext();
		const result = await orgsDelete.execute({ orgId: ORG_ID, yes: true }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("organization", {
			pathParams: { id: ORG_ID },
		});
		expect(result).toEqual({ deleted: true, orgId: ORG_ID });
	});
});

// ---------------------------------------------------------------------------
// orgs.members
// ---------------------------------------------------------------------------

describe("orgs.members", () => {
	test("has correct name and group", () => {
		expect(orgsMembers.name).toBe("orgs.members");
		expect(orgsMembers.group).toBe("orgs");
	});

	test("has readOnlyHint annotation", () => {
		expect(orgsMembers.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /organizations/{id}/members", async () => {
		const members = [{ id: MEMBER_ID, role: "Admin" }];
		const ctx = mockContext({ getResult: members });
		const result = await orgsMembers.execute({ orgId: ORG_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("organization_members", {
			pathParams: { id: ORG_ID },
		});
		expect(result).toEqual(members);
	});
});

// ---------------------------------------------------------------------------
// orgs.updateRole
// ---------------------------------------------------------------------------

describe("orgs.updateRole", () => {
	test("has correct name and group", () => {
		expect(orgsUpdateRole.name).toBe("orgs.updateRole");
		expect(orgsUpdateRole.group).toBe("orgs");
	});

	test("has idempotentHint annotation", () => {
		expect(orgsUpdateRole.annotations?.idempotentHint).toBe(true);
	});

	test("calls PUT /organizations/{id}/members/{mid}/role", async () => {
		const ctx = mockContext({ putResult: { role: "Admin" } });
		const result = await orgsUpdateRole.execute({ orgId: ORG_ID, membershipId: MEMBER_ID, role: "Admin" }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"organization_member_role",
			{ role: "Admin" },
			{ pathParams: { id: ORG_ID, mid: MEMBER_ID } },
		);
		expect(result).toEqual({ role: "Admin" });
	});
});

// ---------------------------------------------------------------------------
// orgs.removeMember
// ---------------------------------------------------------------------------

describe("orgs.removeMember", () => {
	test("has correct name and group", () => {
		expect(orgsRemoveMember.name).toBe("orgs.removeMember");
		expect(orgsRemoveMember.group).toBe("orgs");
	});

	test("has destructiveHint annotation", () => {
		expect(orgsRemoveMember.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /organizations/{id}/members/{mid}", async () => {
		const ctx = mockContext();
		const result = await orgsRemoveMember.execute({ orgId: ORG_ID, membershipId: MEMBER_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("organization_member", {
			pathParams: { id: ORG_ID, mid: MEMBER_ID },
		});
		expect(result).toEqual({ removed: true });
	});
});

// ---------------------------------------------------------------------------
// orgs.billing
// ---------------------------------------------------------------------------

describe("orgs.billing", () => {
	test("has correct name and group", () => {
		expect(orgsBilling.name).toBe("orgs.billing");
		expect(orgsBilling.group).toBe("orgs");
	});

	test("has readOnlyHint annotation", () => {
		expect(orgsBilling.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /organizations/{id}/billing-status", async () => {
		const billing = { plan: "pro", status: "active" };
		const ctx = mockContext({ getResult: billing });
		const result = await orgsBilling.execute({ orgId: ORG_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("organization_billing", {
			pathParams: { id: ORG_ID },
		});
		expect(result).toEqual(billing);
	});
});

// ---------------------------------------------------------------------------
// orgs.setStripe
// ---------------------------------------------------------------------------

describe("orgs.setStripe", () => {
	test("has correct name and group", () => {
		expect(orgsSetStripe.name).toBe("orgs.setStripe");
		expect(orgsSetStripe.group).toBe("orgs");
	});

	test("accepts non-UUID Stripe customer ID", () => {
		const parsed = orgsSetStripe.inputSchema.parse({
			orgId: ORG_ID,
			stripeCustomerId: "cus_abc123xyz",
		});
		expect(parsed.stripeCustomerId).toBe("cus_abc123xyz");
	});

	test("calls PUT /organizations/{id}/stripe-customer with stripeCustomerId field", async () => {
		const ctx = mockContext({ putResult: { id: ORG_ID, stripeCustomerId: "cus_abc" } });
		const result = await orgsSetStripe.execute({ orgId: ORG_ID, stripeCustomerId: "cus_abc" }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"organization_stripe_customer",
			{ stripeCustomerId: "cus_abc" },
			{ pathParams: { id: ORG_ID } },
		);
		expect(result).toEqual({ id: ORG_ID, stripeCustomerId: "cus_abc" });
	});
});

// ---------------------------------------------------------------------------
// orgs.setDefault
// ---------------------------------------------------------------------------

describe("orgs.setDefault", () => {
	test("has correct name and group", () => {
		expect(orgsSetDefault.name).toBe("orgs.setDefault");
		expect(orgsSetDefault.group).toBe("orgs");
	});

	test("calls PUT /organizations/{id}/set-default", async () => {
		const ctx = mockContext({ putResult: { id: ORG_ID } });
		const result = await orgsSetDefault.execute({ orgId: ORG_ID }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith("organization_set_default", undefined, { pathParams: { id: ORG_ID } });
		expect(result).toEqual({ id: ORG_ID });
	});
});

// ---------------------------------------------------------------------------
// orgs.invite (idempotent)
// ---------------------------------------------------------------------------

describe("orgs.invite", () => {
	test("has correct name and group", () => {
		expect(orgsInvite.name).toBe("orgs.invite");
		expect(orgsInvite.group).toBe("orgs");
	});

	test("has idempotentHint annotation", () => {
		expect(orgsInvite.annotations?.idempotentHint).toBe(true);
	});

	test("defaults role to Member", () => {
		const parsed = orgsInvite.inputSchema.parse({ orgId: ORG_ID, email: "a@b.com" });
		expect(parsed.role).toBe("Member");
	});

	test("routes to resend endpoint when a pending invitation matches", async () => {
		const existingInvite = { id: INVITE_ID, email: "user@example.com", isExpired: false };
		const resendResult = { id: INVITE_ID, email: "user@example.com", isExpired: false, token: "fresh" };
		const ctx = mockContext({ getResult: [existingInvite], postResult: resendResult });
		const result = await orgsInvite.execute({ orgId: ORG_ID, email: "User@Example.com", role: "Member" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("org_invitations", {
			pathParams: { orgId: ORG_ID },
		});
		expect(ctx.client.post).toHaveBeenCalledWith(
			"org_invitation_resend",
			{},
			{ pathParams: { orgId: ORG_ID, invId: INVITE_ID } },
		);
		expect(result).toEqual(resendResult);
	});

	test("routes to resend endpoint when an expired invitation matches", async () => {
		const expiredInvite = { id: INVITE_ID, email: "stale@example.com", isExpired: true };
		const resendResult = { id: INVITE_ID, email: "stale@example.com", isExpired: false, token: "fresh" };
		const ctx = mockContext({ getResult: [expiredInvite], postResult: resendResult });
		const result = await orgsInvite.execute({ orgId: ORG_ID, email: "stale@example.com", role: "Member" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"org_invitation_resend",
			{},
			{ pathParams: { orgId: ORG_ID, invId: INVITE_ID } },
		);
		expect(result).toEqual(resendResult);
	});

	test("creates new invitation when no existing row matches", async () => {
		const ctx = mockContext({
			getResult: [],
			postResult: { id: INVITE_ID, email: "new@example.com" },
		});
		const result = await orgsInvite.execute({ orgId: ORG_ID, email: "new@example.com", role: "Admin" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"org_invitations",
			{ email: "new@example.com", role: "Admin" },
			{ pathParams: { orgId: ORG_ID } },
		);
		expect(result).toEqual({ id: INVITE_ID, email: "new@example.com" });
	});
});

// ---------------------------------------------------------------------------
// orgs.invitations
// ---------------------------------------------------------------------------

describe("orgs.invitations", () => {
	test("has correct name and group", () => {
		expect(orgsInvitations.name).toBe("orgs.invitations");
		expect(orgsInvitations.group).toBe("orgs");
	});

	test("has readOnlyHint annotation", () => {
		expect(orgsInvitations.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /organizations/{orgId}/invitations", async () => {
		const ctx = mockContext({ getResult: [] });
		await orgsInvitations.execute({ orgId: ORG_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("org_invitations", {
			pathParams: { orgId: ORG_ID },
		});
	});
});

// ---------------------------------------------------------------------------
// orgs.cancelInvite
// ---------------------------------------------------------------------------

describe("orgs.cancelInvite", () => {
	test("has correct name and group", () => {
		expect(orgsCancelInvite.name).toBe("orgs.cancelInvite");
		expect(orgsCancelInvite.group).toBe("orgs");
	});

	test("has destructiveHint annotation", () => {
		expect(orgsCancelInvite.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /organizations/{orgId}/invitations/{invId}", async () => {
		const ctx = mockContext();
		const result = await orgsCancelInvite.execute({ orgId: ORG_ID, invitationId: INVITE_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("org_invitation", {
			pathParams: { orgId: ORG_ID, invId: INVITE_ID },
		});
		expect(result).toEqual({ cancelled: true, invitationId: INVITE_ID });
	});
});

// ---------------------------------------------------------------------------
// orgs.resendInvite
// ---------------------------------------------------------------------------

describe("orgs.resendInvite", () => {
	test("has correct name and group", () => {
		expect(orgsResendInvite.name).toBe("orgs.resendInvite");
		expect(orgsResendInvite.group).toBe("orgs");
	});

	test("has idempotentHint annotation", () => {
		expect(orgsResendInvite.annotations?.idempotentHint).toBe(true);
	});

	test("calls POST /organizations/{orgId}/invitations/{invId}/resend", async () => {
		const resendResult = { id: INVITE_ID, email: "user@example.com", isExpired: false };
		const ctx = mockContext({ postResult: resendResult });
		const result = await orgsResendInvite.execute({ orgId: ORG_ID, invitationId: INVITE_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"org_invitation_resend",
			{},
			{ pathParams: { orgId: ORG_ID, invId: INVITE_ID } },
		);
		expect(result).toEqual(resendResult);
	});

	test("compact output returns invitation id", () => {
		const formatted = orgsResendInvite.formatOutput?.({ id: INVITE_ID }, "compact");
		expect(formatted).toBe(INVITE_ID);
	});
});

// ---------------------------------------------------------------------------
// orgs.invitationInfo
// ---------------------------------------------------------------------------

describe("orgs.invitationInfo", () => {
	test("has correct name and group", () => {
		expect(orgsInvitationInfo.name).toBe("orgs.invitationInfo");
		expect(orgsInvitationInfo.group).toBe("orgs");
	});

	test("has readOnlyHint annotation", () => {
		expect(orgsInvitationInfo.annotations?.readOnlyHint).toBe(true);
	});

	test("accepts non-UUID token string", () => {
		const parsed = orgsInvitationInfo.inputSchema.parse({ token: "abc123-token-value" });
		expect(parsed.token).toBe("abc123-token-value");
	});

	test("calls GET /invitations/{token}", async () => {
		const ctx = mockContext({ getResult: { orgName: "Test Org" } });
		const result = await orgsInvitationInfo.execute({ token: "my-token" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("invitation_info", {
			pathParams: { token: "my-token" },
		});
		expect(result).toEqual({ orgName: "Test Org" });
	});
});

// ---------------------------------------------------------------------------
// orgs.acceptInvite
// ---------------------------------------------------------------------------

describe("orgs.acceptInvite", () => {
	test("has correct name and group", () => {
		expect(orgsAcceptInvite.name).toBe("orgs.acceptInvite");
		expect(orgsAcceptInvite.group).toBe("orgs");
	});

	test("calls POST /invitations/{token}/accept", async () => {
		const ctx = mockContext({ postResult: { joined: true } });
		const result = await orgsAcceptInvite.execute({ token: "my-token" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("invitation_accept", undefined, {
			pathParams: { token: "my-token" },
		});
		expect(result).toEqual({ joined: true });
	});
});

// ---------------------------------------------------------------------------
// orgs.files
// ---------------------------------------------------------------------------

describe("orgs.files", () => {
	test("has correct name and group", () => {
		expect(orgsFiles.name).toBe("orgs.files");
		expect(orgsFiles.group).toBe("orgs");
	});

	test("has readOnlyHint annotation", () => {
		expect(orgsFiles.annotations?.readOnlyHint).toBe(true);
	});

	test("uses default pagination values", () => {
		const parsed = orgsFiles.inputSchema.parse({ orgId: ORG_ID });
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
	});

	test("calls GET /organizations/{orgId}/files with pagination", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await orgsFiles.execute({ orgId: ORG_ID, page: 2, pageSize: 10 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("org_files", {
			pathParams: { orgId: ORG_ID },
			queryParams: { page: 2, pageSize: 10 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});
});

// ---------------------------------------------------------------------------
// orgs.listAll
// ---------------------------------------------------------------------------

describe("orgs.listAll", () => {
	test("has correct name and group", () => {
		expect(orgsListAll.name).toBe("orgs.listAll");
		expect(orgsListAll.group).toBe("orgs");
	});

	test("has readOnlyHint annotation", () => {
		expect(orgsListAll.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /organizations/all", async () => {
		const ctx = mockContext({ getResult: [{ id: ORG_ID }] });
		const result = await orgsListAll.execute({}, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("organizations_all");
		expect(result).toEqual([{ id: ORG_ID }]);
	});
});

// ---------------------------------------------------------------------------
// orgs.directory (Share-modal member typeahead)
// ---------------------------------------------------------------------------

describe("orgs.directory", () => {
	test("is read-only and GETs the member directory with q", async () => {
		const ctx = mockContext({ getResult: [] });
		expect(orgsDirectory.annotations?.readOnlyHint).toBe(true);
		await orgsDirectory.execute({ orgId: ORG_ID, query: "ada" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("org_member_directory", {
			pathParams: { orgId: ORG_ID },
			queryParams: { q: "ada" },
		});
	});

	test("requires a query of at least 2 characters", () => {
		expect(() => orgsDirectory.inputSchema.parse({ orgId: ORG_ID, query: "a" })).toThrow();
		expect(orgsDirectory.inputSchema.parse({ orgId: ORG_ID, query: "ab" })).toEqual({
			orgId: ORG_ID,
			query: "ab",
		});
	});
});

// ---------------------------------------------------------------------------
// orgs.setAutotidy
// ---------------------------------------------------------------------------

describe("orgs.setAutotidy", () => {
	test("PATCHes kb-autotidy with enabled true", async () => {
		const ctx = mockContext({ patchResult: { kbAutotidyEnabled: true } });
		await orgsSetAutotidy.execute({ orgId: ORG_ID, enabled: true }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith(
			"org_kb_autotidy",
			{ enabled: true },
			{ pathParams: { orgId: ORG_ID } },
		);
	});

	test("PATCHes kb-autotidy with enabled false", async () => {
		const ctx = mockContext({ patchResult: { kbAutotidyEnabled: false } });
		await orgsSetAutotidy.execute({ orgId: ORG_ID, enabled: false }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith(
			"org_kb_autotidy",
			{ enabled: false },
			{ pathParams: { orgId: ORG_ID } },
		);
	});
});

// ---------------------------------------------------------------------------
// registerOrgCommands
// ---------------------------------------------------------------------------

describe("registerOrgCommands", () => {
	test("returns all 21 org commands", () => {
		const commands = registerOrgCommands();
		expect(commands).toHaveLength(21);
	});

	test("all commands belong to orgs group", () => {
		const commands = registerOrgCommands();
		for (const cmd of commands) {
			expect(cmd.group).toBe("orgs");
		}
	});

	test("all command names start with orgs.", () => {
		const commands = registerOrgCommands();
		for (const cmd of commands) {
			expect(cmd.name).toMatch(/^orgs\./);
		}
	});

	test("command names are unique", () => {
		const commands = registerOrgCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
