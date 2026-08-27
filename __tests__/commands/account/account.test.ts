import { describe, expect, test, vi } from "vitest";
import { accountAcceptTerms } from "../../../src/commands/account/accept-terms.js";
import { accountAddLegalDoc } from "../../../src/commands/account/add-legal-doc.js";
import { accountAgreements } from "../../../src/commands/account/agreements.js";
import { accountDelete } from "../../../src/commands/account/delete.js";
import { accountDeleteLegalDoc } from "../../../src/commands/account/delete-legal-doc.js";
import { accountGet } from "../../../src/commands/account/get.js";
import { registerAccountCommands } from "../../../src/commands/account/index.js";
import { accountUpdate } from "../../../src/commands/account/update.js";
import { accountUpdateLegalDoc } from "../../../src/commands/account/update-legal-doc.js";
import { accountUsers } from "../../../src/commands/account/users.js";
import type { CommandContext } from "../../../src/core/command.js";
import { ValidationError } from "../../../src/lib/errors.js";

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
// account.get
// ---------------------------------------------------------------------------

describe("account.get", () => {
	test("has correct name and group", () => {
		expect(accountGet.name).toBe("account.get");
		expect(accountGet.group).toBe("account");
	});

	test("has readOnlyHint annotation", () => {
		expect(accountGet.annotations?.readOnlyHint).toBe(true);
	});

	test("accepts string userId (not UUID-validated)", () => {
		expect(accountGet.inputSchema.parse({ userId: "123" })).toEqual({ userId: "123" });
		expect(accountGet.inputSchema.parse({ userId: "abc" })).toEqual({ userId: "abc" });
	});

	test("calls GET account_user", async () => {
		const ctx = mockContext({ getResult: { id: "123", firstName: "Test" } });
		const result = await accountGet.execute({ userId: "123" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("account_user", {
			pathParams: { id: "123" },
		});
		expect(result).toEqual({ id: "123", firstName: "Test" });
	});
});

// ---------------------------------------------------------------------------
// account.update
// ---------------------------------------------------------------------------

describe("account.update", () => {
	test("has correct name and group", () => {
		expect(accountUpdate.name).toBe("account.update");
		expect(accountUpdate.group).toBe("account");
	});

	test("throws ValidationError when no fields provided", async () => {
		const ctx = mockContext();
		await expect(accountUpdate.execute({ userId: "123" }, ctx)).rejects.toThrow(ValidationError);
	});

	test("calls PUT account_user with firstName (backend is PUT-only, not PATCH)", async () => {
		const ctx = mockContext({ putResult: {} });
		await accountUpdate.execute({ userId: "123", firstName: "Jane" }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"account_user",
			{ firstName: "Jane" },
			{
				pathParams: { id: "123" },
			},
		);
		expect(ctx.client.patch).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// account.agreements
// ---------------------------------------------------------------------------

describe("account.agreements", () => {
	test("has correct name and group", () => {
		expect(accountAgreements.name).toBe("account.agreements");
		expect(accountAgreements.group).toBe("account");
	});

	test("has readOnlyHint annotation", () => {
		expect(accountAgreements.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET user_agreements", async () => {
		const ctx = mockContext({ getResult: [] });
		await accountAgreements.execute({}, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("user_agreements");
	});
});

// ---------------------------------------------------------------------------
// account.acceptTerms
// ---------------------------------------------------------------------------

describe("account.acceptTerms", () => {
	test("has correct name and group", () => {
		expect(accountAcceptTerms.name).toBe("account.acceptTerms");
		expect(accountAcceptTerms.group).toBe("account");
	});

	test("calls POST user_agreement", async () => {
		const ctx = mockContext({ postResult: {} });
		await accountAcceptTerms.execute({ documentVersionId: "v1" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("user_agreement", { documentVersionId: "v1" });
	});
});

// ---------------------------------------------------------------------------
// account.delete
// ---------------------------------------------------------------------------

describe("account.delete", () => {
	test("has correct name and group", () => {
		expect(accountDelete.name).toBe("account.delete");
		expect(accountDelete.group).toBe("account");
	});

	test("has destructiveHint annotation", () => {
		expect(accountDelete.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE account_delete with --yes", async () => {
		const ctx = mockContext();
		const result = await accountDelete.execute({ yes: true }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("account_delete");
		expect(result).toEqual({ deleted: true });
	});

	test("returns deleted:false when not confirmed (non-TTY)", async () => {
		const ctx = mockContext();
		const result = await accountDelete.execute({ yes: false }, ctx);
		expect(result).toEqual({ deleted: false });
	});
});

// ---------------------------------------------------------------------------
// account.users
// ---------------------------------------------------------------------------

describe("account.users", () => {
	test("has correct name and group", () => {
		expect(accountUsers.name).toBe("account.users");
		expect(accountUsers.group).toBe("account");
	});

	test("has readOnlyHint annotation", () => {
		expect(accountUsers.annotations?.readOnlyHint).toBe(true);
	});

	test("accepts state enum", () => {
		expect(accountUsers.inputSchema.parse({ state: "Active" })).toEqual({ state: "Active" });
		expect(() => accountUsers.inputSchema.parse({ state: "Invalid" })).toThrow();
	});

	test("calls GET account_users with filters", async () => {
		const ctx = mockContext({ getResult: [] });
		await accountUsers.execute({ state: "Active", refCode: "REF1" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("account_users", {
			queryParams: { state: "Active", refCode: "REF1" },
		});
	});
});

// ---------------------------------------------------------------------------
// account.addLegalDoc
// ---------------------------------------------------------------------------

describe("account.addLegalDoc", () => {
	test("has correct name and group", () => {
		expect(accountAddLegalDoc.name).toBe("account.addLegalDoc");
		expect(accountAddLegalDoc.group).toBe("account");
	});

	test("requires documentType, version, content", () => {
		expect(() => accountAddLegalDoc.inputSchema.parse({})).toThrow();
		expect(() => accountAddLegalDoc.inputSchema.parse({ documentType: "TOS", version: "1.0" })).toThrow();
	});

	test("calls POST legal_doc_version", async () => {
		const ctx = mockContext({ postResult: { id: "doc1" } });
		await accountAddLegalDoc.execute({ documentType: "TOS", version: "1.0", content: "Terms here" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("legal_doc_version", {
			documentType: "TOS",
			version: "1.0",
			content: "Terms here",
		});
	});
});

// ---------------------------------------------------------------------------
// account.updateLegalDoc
// ---------------------------------------------------------------------------

describe("account.updateLegalDoc", () => {
	test("has correct name and group", () => {
		expect(accountUpdateLegalDoc.name).toBe("account.updateLegalDoc");
		expect(accountUpdateLegalDoc.group).toBe("account");
	});

	test("throws ValidationError when no fields provided", async () => {
		const ctx = mockContext();
		await expect(accountUpdateLegalDoc.execute({ versionId: "v1" }, ctx)).rejects.toThrow(ValidationError);
	});

	test("calls PUT legal_doc_version_id", async () => {
		const ctx = mockContext({ putResult: {} });
		await accountUpdateLegalDoc.execute({ versionId: "v1", content: "Updated" }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"legal_doc_version_id",
			{ content: "Updated" },
			{ pathParams: { id: "v1" } },
		);
	});
});

// ---------------------------------------------------------------------------
// account.deleteLegalDoc
// ---------------------------------------------------------------------------

describe("account.deleteLegalDoc", () => {
	test("has correct name and group", () => {
		expect(accountDeleteLegalDoc.name).toBe("account.deleteLegalDoc");
		expect(accountDeleteLegalDoc.group).toBe("account");
	});

	test("has destructiveHint annotation", () => {
		expect(accountDeleteLegalDoc.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE legal_doc_version_id with --yes", async () => {
		const ctx = mockContext();
		const result = await accountDeleteLegalDoc.execute({ versionId: "v1", yes: true }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("legal_doc_version_id", {
			pathParams: { id: "v1" },
		});
		expect(result).toEqual({ deleted: true, versionId: "v1" });
	});
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("registerAccountCommands", () => {
	test("returns 9 commands", () => {
		expect(registerAccountCommands()).toHaveLength(9);
	});
});
