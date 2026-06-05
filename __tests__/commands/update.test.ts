import { copyFileSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Override only the fs calls installWindowsBinary touches; keep everything else
// real so the rest of the module graph loads normally.
vi.mock("node:fs", async () => {
	const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
	return {
		...actual,
		mkdirSync: vi.fn(),
		renameSync: vi.fn(),
		copyFileSync: vi.fn(),
		readdirSync: vi.fn(() => []),
		rmSync: vi.fn(),
	};
});

const { installWindowsBinary } = await import("../../src/commands/update.js");

const mkdir = vi.mocked(mkdirSync);
const rename = vi.mocked(renameSync);
const copy = vi.mocked(copyFileSync);
const readdir = vi.mocked(readdirSync);
const rm = vi.mocked(rmSync);

describe("installWindowsBinary (Windows self-update)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		readdir.mockReturnValue([] as never);
	});

	test("renames the in-use binary aside, then copies the new one into place", () => {
		const dest = installWindowsBinary("/tmp/extracted/elnora-win-x64.exe", "/home/x/.elnora/bin");

		expect(mkdir).toHaveBeenCalled();
		expect(rename).toHaveBeenCalledTimes(1);
		const [from, to] = rename.mock.calls[0];
		expect(String(from)).toMatch(/elnora\.exe$/);
		expect(String(to)).toMatch(/elnora\.exe\.old-\d+$/);
		// Copy lands at the original destination, only AFTER the rename freed it.
		expect(copy).toHaveBeenCalledWith("/tmp/extracted/elnora-win-x64.exe", expect.stringMatching(/elnora\.exe$/));
		expect(dest).toMatch(/elnora\.exe$/);
	});

	test("tolerates a missing existing binary (ENOENT on rename)", () => {
		rename.mockImplementationOnce(() => {
			const e = new Error("not found") as NodeJS.ErrnoException;
			e.code = "ENOENT";
			throw e;
		});
		expect(() => installWindowsBinary("src", "dir")).not.toThrow();
		expect(copy).toHaveBeenCalled();
	});

	test("propagates a non-ENOENT rename failure instead of swallowing it", () => {
		rename.mockImplementationOnce(() => {
			const e = new Error("device busy") as NodeJS.ErrnoException;
			e.code = "EBUSY";
			throw e;
		});
		expect(() => installWindowsBinary("src", "dir")).toThrow(/busy/);
		expect(copy).not.toHaveBeenCalled();
	});

	test("sweeps stale .old-* binaries from previous updates, leaving other files", () => {
		readdir.mockReturnValue(["elnora.exe", "elnora.exe.old-111", "elnora.exe.old-222", "keep.txt"] as never);
		installWindowsBinary("src", "dir");
		const removed = rm.mock.calls.map((c) => String(c[0]));
		expect(removed.some((p) => p.includes("elnora.exe.old-111"))).toBe(true);
		expect(removed.some((p) => p.includes("elnora.exe.old-222"))).toBe(true);
		expect(removed.some((p) => p.endsWith("keep.txt"))).toBe(false);
		expect(removed.some((p) => p.endsWith("elnora.exe"))).toBe(false);
	});
});
