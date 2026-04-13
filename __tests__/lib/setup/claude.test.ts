import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock homedir before importing the module under test
const TEST_HOME = join(tmpdir(), `elnora-setup-test-${Date.now()}`);

vi.mock("node:os", async () => {
	const actual = await vi.importActual("node:os");
	return { ...actual, homedir: () => TEST_HOME };
});

// Now import after mocks are set up
const { setupClaude } = await import("../../../src/lib/setup/claude.js");
const { MARKETPLACE_NAME, PLUGIN_ID, LEGACY_MARKETPLACE_NAMES, LEGACY_PLUGIN_IDS } = await import(
	"../../../src/lib/setup/common.js"
);

describe("setupClaude", () => {
	let stderrWrite: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		stderrWrite = vi.spyOn(process.stderr, "write").mockReturnValue(true);
		// Suppress console.error output during tests
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		stderrWrite.mockRestore();
		vi.restoreAllMocks();
		try {
			rmSync(TEST_HOME, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	});

	test("returns false if ~/.claude/ does not exist", () => {
		const result = setupClaude();
		expect(result).toBe(false);
	});

	test("registers GitHub marketplace in known_marketplaces.json", () => {
		// Create ~/.claude/
		const claudeDir = join(TEST_HOME, ".claude");
		mkdirSync(join(claudeDir, "plugins"), { recursive: true });
		writeFileSync(join(claudeDir, "plugins", "known_marketplaces.json"), "{}");
		writeFileSync(join(claudeDir, "settings.json"), "{}");

		const result = setupClaude();
		expect(result).toBe(true);

		const marketplaces = JSON.parse(readFileSync(join(claudeDir, "plugins", "known_marketplaces.json"), "utf-8"));
		expect(marketplaces[MARKETPLACE_NAME]).toBeDefined();
		expect(marketplaces[MARKETPLACE_NAME].source.source).toBe("github");
		expect(marketplaces[MARKETPLACE_NAME].source.repo).toBe("Elnora-AI/elnora-plugins");
	});

	test("enables plugin in settings.json", () => {
		const claudeDir = join(TEST_HOME, ".claude");
		mkdirSync(join(claudeDir, "plugins"), { recursive: true });
		writeFileSync(join(claudeDir, "plugins", "known_marketplaces.json"), "{}");
		writeFileSync(join(claudeDir, "settings.json"), "{}");

		setupClaude();

		const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf-8"));
		expect(settings.enabledPlugins[PLUGIN_ID]).toBe(true);
	});

	test("cleans up legacy marketplace and plugin entries", () => {
		const claudeDir = join(TEST_HOME, ".claude");
		mkdirSync(join(claudeDir, "plugins"), { recursive: true });

		// Pre-populate with legacy entries
		const legacyMarketplaces: Record<string, unknown> = {};
		for (const name of LEGACY_MARKETPLACE_NAMES) {
			legacyMarketplaces[name] = { source: { source: "directory", path: "/old" } };
		}
		writeFileSync(join(claudeDir, "plugins", "known_marketplaces.json"), JSON.stringify(legacyMarketplaces));

		const legacySettings: Record<string, unknown> = {
			enabledPlugins: {} as Record<string, boolean>,
		};
		for (const id of LEGACY_PLUGIN_IDS) {
			(legacySettings.enabledPlugins as Record<string, boolean>)[id] = true;
		}
		writeFileSync(join(claudeDir, "settings.json"), JSON.stringify(legacySettings));

		setupClaude();

		const marketplaces = JSON.parse(readFileSync(join(claudeDir, "plugins", "known_marketplaces.json"), "utf-8"));
		for (const name of LEGACY_MARKETPLACE_NAMES) {
			expect(marketplaces[name]).toBeUndefined();
		}

		const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf-8"));
		for (const id of LEGACY_PLUGIN_IDS) {
			expect(settings.enabledPlugins[id]).toBeUndefined();
		}
	});

	test("preserves existing settings", () => {
		const claudeDir = join(TEST_HOME, ".claude");
		mkdirSync(join(claudeDir, "plugins"), { recursive: true });
		writeFileSync(join(claudeDir, "plugins", "known_marketplaces.json"), "{}");
		writeFileSync(
			join(claudeDir, "settings.json"),
			JSON.stringify({
				someOtherSetting: true,
				enabledPlugins: { "other-plugin@other": true },
			}),
		);

		setupClaude();

		const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf-8"));
		expect(settings.someOtherSetting).toBe(true);
		expect(settings.enabledPlugins["other-plugin@other"]).toBe(true);
		expect(settings.enabledPlugins[PLUGIN_ID]).toBe(true);
	});
});
