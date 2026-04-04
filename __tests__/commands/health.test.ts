import { afterEach, describe, expect, test, vi } from "vitest";
import { healthCheck } from "../../src/commands/health.js";

describe("health.check command", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

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

	test("calls /health and returns status from JSON", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve('{"status":"healthy"}'),
		});
		const ctx = {} as Parameters<typeof healthCheck.execute>[1];
		const result = await healthCheck.execute({}, ctx);
		expect(result.status).toBe("healthy");
		expect(result.timestamp).toBeDefined();
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://platform.elnora.ai/health",
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	test("handles plain text response", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve("ok"),
		});
		const ctx = {} as Parameters<typeof healthCheck.execute>[1];
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
