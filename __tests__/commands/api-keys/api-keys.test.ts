import { describe, expect, test, vi } from "vitest";
import { keysCreate } from "../../../src/commands/api-keys/create.js";
import { keysGetPolicy } from "../../../src/commands/api-keys/get-policy.js";
import { registerApiKeyCommands } from "../../../src/commands/api-keys/index.js";
import { keysList } from "../../../src/commands/api-keys/list.js";
import { keysRevoke } from "../../../src/commands/api-keys/revoke.js";
import { keysSetPolicy } from "../../../src/commands/api-keys/set-policy.js";
import type { CommandContext } from "../../../src/core/command.js";

const KEY_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

function mockContext(overrides?: {
	getResult?: unknown;
	postResult?: unknown;
	putResult?: unknown;
	delResult?: unknown;
}): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? {}),
			post: vi.fn().mockResolvedValue(overrides?.postResult ?? {}),
			put: vi.fn().mockResolvedValue(overrides?.putResult ?? {}),
			del: vi.fn().mockResolvedValue(overrides?.delResult ?? undefined),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

// ---------------------------------------------------------------------------
// api-keys.create
// ---------------------------------------------------------------------------

describe("api-keys.create", () => {
	test("has correct name and group", () => {
		expect(keysCreate.name).toBe("api-keys.create");
		expect(keysCreate.group).toBe("api-keys");
	});

	test("requires name", () => {
		expect(() => keysCreate.inputSchema.parse({})).toThrow();
	});

	test("parses comma-separated scopes", async () => {
		const ctx = mockContext({ postResult: { id: KEY_ID } });
		await keysCreate.execute({ name: "My Key", scopes: "read, write , admin" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("api_keys", {
			name: "My Key",
			scopes: ["read", "write", "admin"],
		});
	});

	test("sends undefined scopes when not provided", async () => {
		const ctx = mockContext({ postResult: { id: KEY_ID } });
		await keysCreate.execute({ name: "My Key" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("api_keys", {
			name: "My Key",
			scopes: undefined,
		});
	});
});

// ---------------------------------------------------------------------------
// api-keys.list
// ---------------------------------------------------------------------------

describe("api-keys.list", () => {
	test("has correct name and group", () => {
		expect(keysList.name).toBe("api-keys.list");
		expect(keysList.group).toBe("api-keys");
	});

	test("has readOnlyHint annotation", () => {
		expect(keysList.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET api_keys", async () => {
		const ctx = mockContext({ getResult: [] });
		await keysList.execute({}, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("api_keys");
	});
});

// ---------------------------------------------------------------------------
// api-keys.revoke
// ---------------------------------------------------------------------------

describe("api-keys.revoke", () => {
	test("has correct name and group", () => {
		expect(keysRevoke.name).toBe("api-keys.revoke");
		expect(keysRevoke.group).toBe("api-keys");
	});

	test("has destructiveHint annotation", () => {
		expect(keysRevoke.annotations?.destructiveHint).toBe(true);
	});

	test("requires valid UUID keyId", () => {
		expect(() => keysRevoke.inputSchema.parse({ keyId: "not-uuid" })).toThrow();
		expect(keysRevoke.inputSchema.parse({ keyId: KEY_ID })).toEqual({ keyId: KEY_ID });
	});

	test("calls DELETE api_key", async () => {
		const ctx = mockContext();
		const result = await keysRevoke.execute({ keyId: KEY_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("api_key", {
			pathParams: { id: KEY_ID },
		});
		expect(result).toEqual({ revoked: true, keyId: KEY_ID });
	});
});

// ---------------------------------------------------------------------------
// api-keys.getPolicy
// ---------------------------------------------------------------------------

describe("api-keys.getPolicy", () => {
	test("has correct name and group", () => {
		expect(keysGetPolicy.name).toBe("api-keys.getPolicy");
		expect(keysGetPolicy.group).toBe("api-keys");
	});

	test("has readOnlyHint annotation", () => {
		expect(keysGetPolicy.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET api_key_policy", async () => {
		const ctx = mockContext({ getResult: { policy: "all_members" } });
		await keysGetPolicy.execute({}, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("api_key_policy");
	});
});

// ---------------------------------------------------------------------------
// api-keys.setPolicy
// ---------------------------------------------------------------------------

describe("api-keys.setPolicy", () => {
	test("has correct name and group", () => {
		expect(keysSetPolicy.name).toBe("api-keys.setPolicy");
		expect(keysSetPolicy.group).toBe("api-keys");
	});

	test("validates policy enum", () => {
		expect(keysSetPolicy.inputSchema.parse({ policy: "all_members" })).toEqual({ policy: "all_members" });
		expect(keysSetPolicy.inputSchema.parse({ policy: "admins_only" })).toEqual({ policy: "admins_only" });
		expect(() => keysSetPolicy.inputSchema.parse({ policy: "invalid" })).toThrow();
	});

	test("calls PUT api_key_policy", async () => {
		const ctx = mockContext({ putResult: {} });
		await keysSetPolicy.execute({ policy: "admins_only" }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith("api_key_policy", { policy: "admins_only" });
	});
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("registerApiKeyCommands", () => {
	test("returns 5 commands", () => {
		expect(registerApiKeyCommands()).toHaveLength(5);
	});
});
