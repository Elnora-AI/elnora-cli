import { describe, expect, test, vi } from "vitest";
import { registerAuditCommands } from "../../../src/commands/audit/index.js";
import { auditList } from "../../../src/commands/audit/list.js";
import { registerFeedbackCommands } from "../../../src/commands/feedback/index.js";
import { feedbackSubmit } from "../../../src/commands/feedback/submit.js";
import { flagsGet } from "../../../src/commands/flags/get.js";
import { registerFlagCommands } from "../../../src/commands/flags/index.js";
import { flagsList } from "../../../src/commands/flags/list.js";
import { flagsSet } from "../../../src/commands/flags/set.js";
import type { CommandContext } from "../../../src/core/command.js";

const ORG_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

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
// audit.list
// ---------------------------------------------------------------------------

describe("audit.list", () => {
	test("has correct name and group", () => {
		expect(auditList.name).toBe("audit.list");
		expect(auditList.group).toBe("audit");
	});

	test("has readOnlyHint annotation", () => {
		expect(auditList.annotations?.readOnlyHint).toBe(true);
	});

	test("requires valid UUID org", () => {
		expect(() => auditList.inputSchema.parse({})).toThrow();
		expect(() => auditList.inputSchema.parse({ orgId: "not-uuid" })).toThrow();
	});

	test("uses default pagination", () => {
		const parsed = auditList.inputSchema.parse({ orgId: ORG_ID });
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
	});

	test("calls GET audit_log with filters", async () => {
		const ctx = mockContext({ getResult: { items: [] } });
		await auditList.execute({ orgId: ORG_ID, page: 1, pageSize: 10, action: "create", userId: "u1" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("audit_log", {
			pathParams: { orgId: ORG_ID },
			queryParams: { page: 1, pageSize: 10, action: "create", userId: "u1" },
		});
	});

	test("formatOutput json returns pretty JSON", () => {
		const output = { items: [] };
		expect(auditList.formatOutput(output, "json")).toBe(JSON.stringify(output, null, 2));
	});
});

describe("registerAuditCommands", () => {
	test("returns 1 command", () => {
		expect(registerAuditCommands()).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// feedback.submit
// ---------------------------------------------------------------------------

describe("feedback.submit", () => {
	test("has correct name and group", () => {
		expect(feedbackSubmit.name).toBe("feedback.submit");
		expect(feedbackSubmit.group).toBe("feedback");
	});

	test("requires title and description", () => {
		expect(() => feedbackSubmit.inputSchema.parse({})).toThrow();
		expect(() => feedbackSubmit.inputSchema.parse({ title: "Bug" })).toThrow();
	});

	test("calls POST feedback", async () => {
		const ctx = mockContext({ postResult: { id: "fb1" } });
		await feedbackSubmit.execute({ title: "Bug Report", description: "Something broke" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("feedback", {
			title: "Bug Report",
			description: "Something broke",
		});
	});
});

describe("registerFeedbackCommands", () => {
	test("returns 1 command", () => {
		expect(registerFeedbackCommands()).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// flags.list
// ---------------------------------------------------------------------------

describe("flags.list", () => {
	test("has correct name and group", () => {
		expect(flagsList.name).toBe("flags.list");
		expect(flagsList.group).toBe("flags");
	});

	test("has readOnlyHint annotation", () => {
		expect(flagsList.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET feature_flags", async () => {
		const ctx = mockContext({ getResult: [] });
		await flagsList.execute({}, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("feature_flags");
	});
});

// ---------------------------------------------------------------------------
// flags.get
// ---------------------------------------------------------------------------

describe("flags.get", () => {
	test("has correct name and group", () => {
		expect(flagsGet.name).toBe("flags.get");
		expect(flagsGet.group).toBe("flags");
	});

	test("has readOnlyHint annotation", () => {
		expect(flagsGet.annotations?.readOnlyHint).toBe(true);
	});

	test("requires key", () => {
		expect(() => flagsGet.inputSchema.parse({})).toThrow();
	});

	test("calls GET feature_flag", async () => {
		const ctx = mockContext({ getResult: { key: "beta", value: true } });
		await flagsGet.execute({ key: "beta" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("feature_flag", {
			pathParams: { key: "beta" },
		});
	});
});

// ---------------------------------------------------------------------------
// flags.set
// ---------------------------------------------------------------------------

describe("flags.set", () => {
	test("has correct name and group", () => {
		expect(flagsSet.name).toBe("flags.set");
		expect(flagsSet.group).toBe("flags");
	});

	test("validates value enum", () => {
		expect(flagsSet.inputSchema.parse({ key: "beta", value: "true" })).toMatchObject({
			key: "beta",
			value: "true",
		});
		expect(() => flagsSet.inputSchema.parse({ key: "beta", value: "maybe" })).toThrow();
	});

	test("calls PUT feature_flag with boolean conversion and --yes", async () => {
		const ctx = mockContext({ putResult: {} });
		await flagsSet.execute({ key: "beta", value: "true", yes: true }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"feature_flag",
			{ value: true },
			{
				pathParams: { key: "beta" },
			},
		);
	});

	test("converts 'false' string to boolean false", async () => {
		const ctx = mockContext({ putResult: {} });
		await flagsSet.execute({ key: "beta", value: "false", yes: true }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"feature_flag",
			{ value: false },
			{
				pathParams: { key: "beta" },
			},
		);
	});

	test("returns early when not confirmed (non-TTY)", async () => {
		const ctx = mockContext();
		const result = await flagsSet.execute({ key: "beta", value: "true", yes: false }, ctx);
		expect(ctx.client.put).not.toHaveBeenCalled();
		expect(result).toEqual({ updated: false, key: "beta" });
	});
});

describe("registerFlagCommands", () => {
	test("returns 3 commands", () => {
		expect(registerFlagCommands()).toHaveLength(3);
	});
});
