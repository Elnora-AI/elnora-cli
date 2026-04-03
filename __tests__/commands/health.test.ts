import { describe, expect, test, vi } from "vitest";
import { healthCheck } from "../../src/commands/health.js";
import type { CommandContext } from "../../src/core/command.js";

function mockContext(overrides?: { getResult?: unknown }): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? { status: "ok" }),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

describe("health.check command", () => {
	test("has correct name and group", () => {
		expect(healthCheck.name).toBe("health.check");
		expect(healthCheck.group).toBe("health");
	});

	test("has Zod input schema (empty object)", () => {
		const parsed = healthCheck.inputSchema.parse({});
		expect(parsed).toEqual({});
	});

	test("has readOnlyHint annotation", () => {
		expect(healthCheck.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /health and returns status", async () => {
		const ctx = mockContext({ getResult: { status: "healthy" } });
		const result = await healthCheck.execute({}, ctx);
		expect(result.status).toBe("healthy");
		expect(result.timestamp).toBeDefined();
		expect(ctx.client.get).toHaveBeenCalledWith("/health");
	});

	test("defaults status to 'ok' if not in response", async () => {
		const ctx = mockContext({ getResult: {} });
		const result = await healthCheck.execute({}, ctx);
		expect(result.status).toBe("ok");
	});

	test("formatOutput compact returns just status", () => {
		const output = { status: "ok", timestamp: "2026-04-02T00:00:00Z" };
		expect(healthCheck.formatOutput(output, "compact")).toBe("ok");
	});

	test("formatOutput json returns JSON", () => {
		const output = { status: "ok", timestamp: "2026-04-02T00:00:00Z" };
		const formatted = healthCheck.formatOutput(output, "json");
		expect(JSON.parse(formatted)).toEqual(output);
	});
});
