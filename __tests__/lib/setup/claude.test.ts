import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock homedir before importing the module under test
const TEST_HOME = mkdtempSync(join(tmpdir(), "elnora-setup-test-"));

vi.mock("node:os", async () => {
	const actual = await vi.importActual("node:os");
	return { ...actual, homedir: () => TEST_HOME };
});

// Swappable mock for child_process.spawn so tests can simulate clean exit,
// non-zero exit (command failed), or ENOENT (claude not on PATH).
type SpawnOutcome = { kind: "exit"; code: number } | { kind: "error"; err: NodeJS.ErrnoException };

let nextOutcomes: SpawnOutcome[] = [];
const spawnCalls: { file: string; args: readonly string[] }[] = [];

vi.mock("node:child_process", () => ({
	spawn: (file: string, args: readonly string[], _options: unknown) => {
		spawnCalls.push({ file, args });
		const ee = new EventEmitter();
		const outcome: SpawnOutcome = nextOutcomes.shift() ?? { kind: "exit", code: 0 };
		// Defer event emission to next microtask so the caller can attach listeners.
		queueMicrotask(() => {
			if (outcome.kind === "error") ee.emit("error", outcome.err);
			else ee.emit("close", outcome.code);
		});
		return ee;
	},
}));

// Now import after mocks are set up
const { setupClaude } = await import("../../../src/lib/setup/claude.js");
const { MARKETPLACE_GITHUB_URL, PLUGIN_ID } = await import("../../../src/lib/setup/common.js");

describe("setupClaude", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		spawnCalls.length = 0;
		nextOutcomes = [];
	});

	afterEach(() => {
		vi.restoreAllMocks();
		try {
			rmSync(TEST_HOME, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	});

	test("returns false if ~/.claude/ does not exist", async () => {
		const result = await setupClaude();
		expect(result).toBe(false);
		expect(spawnCalls).toHaveLength(0);
	});

	test("invokes `claude plugin marketplace add` and `claude plugin install` in order", async () => {
		mkdirSync(join(TEST_HOME, ".claude"), { recursive: true });

		const result = await setupClaude();
		expect(result).toBe(true);
		expect(spawnCalls).toHaveLength(2);

		expect(spawnCalls[0].file).toBe("claude");
		expect(spawnCalls[0].args).toEqual(["plugin", "marketplace", "add", MARKETPLACE_GITHUB_URL]);

		expect(spawnCalls[1].file).toBe("claude");
		expect(spawnCalls[1].args).toEqual(["plugin", "install", PLUGIN_ID]);
	});

	test("returns false and stops if marketplace add exits non-zero", async () => {
		mkdirSync(join(TEST_HOME, ".claude"), { recursive: true });
		nextOutcomes = [{ kind: "exit", code: 1 }];

		const result = await setupClaude();
		expect(result).toBe(false);
		// Install must not run after add fails.
		expect(spawnCalls).toHaveLength(1);
	});

	test("returns false with friendly message if `claude` is missing from PATH", async () => {
		mkdirSync(join(TEST_HOME, ".claude"), { recursive: true });
		const enoentErr: NodeJS.ErrnoException = Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
		nextOutcomes = [{ kind: "error", err: enoentErr }];

		const result = await setupClaude();
		expect(result).toBe(false);
		expect(spawnCalls).toHaveLength(1);
	});

	test("returns false if plugin install fails after successful marketplace add", async () => {
		mkdirSync(join(TEST_HOME, ".claude"), { recursive: true });
		nextOutcomes = [
			{ kind: "exit", code: 0 },
			{ kind: "exit", code: 1 },
		];

		const result = await setupClaude();
		expect(result).toBe(false);
		expect(spawnCalls).toHaveLength(2);
	});
});
