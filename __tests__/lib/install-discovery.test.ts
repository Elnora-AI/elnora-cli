import { describe, expect, test, vi } from "vitest";

// In-memory filesystem for the discovery scan: which paths "exist" as files, and
// their realpath mappings (for symlink/dedupe scenarios).
const fsState = vi.hoisted(() => ({
	files: new Set<string>(),
	links: new Map<string, string>(),
}));

vi.mock("node:fs", () => ({
	existsSync: (p: string) => fsState.files.has(p),
	statSync: (p: string) => ({ isFile: () => fsState.files.has(p) }),
	realpathSync: (p: string) => fsState.links.get(p) ?? p,
}));

const { discoverInstalls, uninstallCommandFor } = await import("../../src/lib/install-discovery.js");

function reset(files: string[], links: Record<string, string> = {}) {
	fsState.files = new Set(files);
	fsState.links = new Map(Object.entries(links));
}

const POSIX = {
	platform: "linux" as NodeJS.Platform,
	pathExt: "",
	home: "/home/u",
	installDirOverride: undefined,
};

describe("discoverInstalls", () => {
	test("classifies a single npm install and marks it active", () => {
		reset(["/proj/node_modules/.bin/elnora"]);
		const installs = discoverInstalls({
			...POSIX,
			pathVar: "/proj/node_modules/.bin:/usr/bin",
			execPath: "/usr/bin/node",
			argv1: "/proj/node_modules/.bin/elnora",
		});
		expect(installs).toHaveLength(1);
		expect(installs[0].source).toBe("npm");
		expect(installs[0].active).toBe(true);
	});

	test("dedupes two PATH entries that resolve to the same realpath (symlink)", () => {
		reset(["/opt/homebrew/bin/elnora", "/usr/local/bin/elnora"], {
			"/opt/homebrew/bin/elnora": "/opt/homebrew/Cellar/elnora/2.0.5/bin/elnora",
			"/usr/local/bin/elnora": "/opt/homebrew/Cellar/elnora/2.0.5/bin/elnora",
		});
		const installs = discoverInstalls({
			...POSIX,
			pathVar: "/opt/homebrew/bin:/usr/local/bin",
			execPath: "/usr/bin/node",
			argv1: "/x",
		});
		expect(installs).toHaveLength(1);
		expect(installs[0].source).toBe("homebrew");
	});

	test("finds multiple distinct installs with exactly one active", () => {
		reset(["/home/u/.elnora/bin/elnora", "/usr/local/lib/node_modules/.bin/elnora", "/opt/homebrew/bin/elnora"], {
			"/opt/homebrew/bin/elnora": "/opt/homebrew/Cellar/elnora/2.0.5/bin/elnora",
		});
		const installs = discoverInstalls({
			...POSIX,
			pathVar: "/home/u/.elnora/bin:/usr/local/lib/node_modules/.bin:/opt/homebrew/bin",
			execPath: "/home/u/.elnora/bin/elnora", // packaged binary is the active one
			argv1: "/home/u/.elnora/bin/elnora",
		});
		expect(installs).toHaveLength(3);
		expect(installs.filter((i) => i.active)).toHaveLength(1);
		expect(installs.find((i) => i.active)?.source).toBe("binary");
		expect(installs.map((i) => i.source).sort()).toEqual(["binary", "homebrew", "npm"]);
	});

	test("classifies an entry whose realpath is a .ts source as dev", () => {
		reset(["/work/.bin/elnora"], { "/work/.bin/elnora": "/work/elnora-cli/src/cli.ts" });
		const installs = discoverInstalls({
			...POSIX,
			pathVar: "/work/.bin",
			execPath: "/usr/bin/node",
			argv1: "/work/elnora-cli/src/cli.ts",
		});
		expect(installs[0].source).toBe("dev");
	});

	test("Windows: probes PATHEXT candidates", () => {
		reset(["C:\\Users\\u\\.elnora\\bin\\elnora.exe"]);
		const installs = discoverInstalls({
			platform: "win32",
			pathExt: ".EXE;.CMD",
			home: "C:\\Users\\u",
			installDirOverride: undefined,
			pathVar: "C:\\Users\\u\\.elnora\\bin",
			execPath: "C:\\Users\\u\\.elnora\\bin\\elnora.exe",
			argv1: "C:\\Users\\u\\.elnora\\bin\\elnora.exe",
		});
		expect(installs).toHaveLength(1);
		expect(installs[0].source).toBe("binary");
		expect(installs[0].active).toBe(true);
	});

	test("Windows npm global: collapses same-dir shims, classifies npm, detects active via prefix", () => {
		// npm writes BOTH an extensionless shim and elnora.cmd into the prefix dir;
		// a separate packaged binary lives in ~/.elnora/bin.
		reset([
			"C:\\Users\\u\\AppData\\Roaming\\npm\\elnora.cmd",
			"C:\\Users\\u\\AppData\\Roaming\\npm\\elnora",
			"C:\\Users\\u\\.elnora\\bin\\elnora.exe",
		]);
		const installs = discoverInstalls({
			platform: "win32",
			pathExt: ".EXE;.CMD",
			home: "C:\\Users\\u",
			installDirOverride: undefined,
			pathVar: "C:\\Users\\u\\AppData\\Roaming\\npm;C:\\Users\\u\\.elnora\\bin",
			execPath: "C:\\Program Files\\nodejs\\node.exe",
			argv1: "C:\\Users\\u\\AppData\\Roaming\\npm\\node_modules\\@elnora-ai\\cli\\dist\\cli.js",
		});
		// The two shims in the npm dir collapse to ONE install (not double-counted).
		expect(installs).toHaveLength(2);
		const npm = installs.find((i) => i.source === "npm");
		expect(npm).toBeDefined();
		expect(npm?.active).toBe(true); // matched via npm prefix (shims aren't symlinks)
		const binary = installs.find((i) => i.source === "binary");
		expect(binary?.active).toBe(false); // the shadow
	});
});

describe("uninstallCommandFor", () => {
	const base = { path: "/p/elnora", realPath: "/p/elnora", pathDir: "/p", active: false };
	test("npm / homebrew commands", () => {
		expect(uninstallCommandFor({ ...base, source: "npm" })).toBe("npm uninstall -g @elnora-ai/cli");
		expect(uninstallCommandFor({ ...base, source: "homebrew" })).toBe("brew uninstall elnora");
	});
	test("dev returns null (not a competing install)", () => {
		expect(uninstallCommandFor({ ...base, source: "dev" })).toBeNull();
	});
	test("binary/unknown returns a filesystem removal of the specific path", () => {
		const cmd = uninstallCommandFor({ ...base, source: "binary" });
		expect(cmd).toContain("/p/elnora");
		expect(cmd).toMatch(/^(rm|Remove-Item)/);
	});
});
