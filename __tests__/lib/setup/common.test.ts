import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const TEST_HOME = join(tmpdir(), `elnora-setup-common-${Date.now()}`);

vi.mock("node:os", async () => {
	const actual = await vi.importActual("node:os");
	return { ...actual, homedir: () => TEST_HOME };
});

const { detectPlatforms } = await import("../../../src/lib/setup/common.js");

describe("detectPlatforms", () => {
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

	test("detects no platforms when none installed", () => {
		const platforms = detectPlatforms();
		expect(platforms.every((p) => !p.installed)).toBe(true);
	});

	test("detects Claude Code when ~/.claude/ exists", () => {
		mkdirSync(join(TEST_HOME, ".claude"), { recursive: true });
		const platforms = detectPlatforms();
		const claude = platforms.find((p) => p.name === "claude");
		expect(claude?.installed).toBe(true);
	});

	test("detects Cursor when ~/.cursor/ exists", () => {
		mkdirSync(join(TEST_HOME, ".cursor"), { recursive: true });
		const platforms = detectPlatforms();
		const cursor = platforms.find((p) => p.name === "cursor");
		expect(cursor?.installed).toBe(true);
	});

	test("returns all four platform entries", () => {
		const platforms = detectPlatforms();
		expect(platforms).toHaveLength(4);
		const names = platforms.map((p) => p.name);
		expect(names).toContain("claude");
		expect(names).toContain("cursor");
		expect(names).toContain("vscode");
		expect(names).toContain("codex");
	});
});
