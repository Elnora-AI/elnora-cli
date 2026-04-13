import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const TEST_HOME = join(tmpdir(), `elnora-setup-cursor-${Date.now()}`);

vi.mock("node:os", async () => {
	const actual = await vi.importActual("node:os");
	return { ...actual, homedir: () => TEST_HOME };
});

const { setupCursor } = await import("../../../src/lib/setup/cursor.js");

describe("setupCursor", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		try {
			rmSync(TEST_HOME, { recursive: true, force: true });
		} catch {
			// ignore
		}
	});

	test("returns false if ~/.cursor/ does not exist", () => {
		expect(setupCursor("test-key")).toBe(false);
	});

	test("writes MCP config to ~/.cursor/mcp.json", () => {
		mkdirSync(join(TEST_HOME, ".cursor"), { recursive: true });

		const result = setupCursor("elnora_live_test123");
		expect(result).toBe(true);

		const config = JSON.parse(readFileSync(join(TEST_HOME, ".cursor", "mcp.json"), "utf-8"));
		expect(config.mcpServers.elnora.url).toBe("https://mcp.elnora.ai/mcp");
		expect(config.mcpServers.elnora.headers["X-API-Key"]).toBe("elnora_live_test123");
	});

	test("preserves existing MCP servers", () => {
		const cursorDir = join(TEST_HOME, ".cursor");
		mkdirSync(cursorDir, { recursive: true });
		writeFileSync(
			join(cursorDir, "mcp.json"),
			JSON.stringify({ mcpServers: { other: { url: "https://other.example.com" } } }),
		);

		setupCursor("key");

		const config = JSON.parse(readFileSync(join(cursorDir, "mcp.json"), "utf-8"));
		expect(config.mcpServers.other.url).toBe("https://other.example.com");
		expect(config.mcpServers.elnora.url).toBe("https://mcp.elnora.ai/mcp");
	});
});
