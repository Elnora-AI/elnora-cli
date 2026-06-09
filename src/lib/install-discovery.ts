/**
 * Discover every `elnora` on PATH and classify each install, so `elnora doctor`
 * can flag shadow installs (a stale copy earlier on PATH is the classic "why
 * didn't my upgrade take effect" bug). Pure filesystem scan — no child processes.
 */

import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

type PathModule = typeof posix;

export type InstallSource = "npm" | "homebrew" | "binary" | "dev" | "unknown";

export interface FoundInstall {
	/** The on-PATH entry the shell would resolve. */
	path: string;
	/** Symlinks/shims resolved (used for dedupe + active match). */
	realPath: string;
	source: InstallSource;
	/** The $PATH directory it was found in. */
	pathDir: string;
	/** Whether this is the install running right now. */
	active: boolean;
}

export interface DiscoverEnv {
	pathVar: string;
	pathExt: string;
	platform: NodeJS.Platform;
	home: string;
	execPath: string;
	argv1: string;
	installDirOverride?: string;
}

const norm = (p: string): string => p.replace(/\\/g, "/").toLowerCase();

function safeRealPath(p: string): string {
	try {
		return realpathSync(p);
	} catch {
		return p;
	}
}

function candidateNames(platform: NodeJS.Platform, pathExt: string): string[] {
	if (platform !== "win32") return ["elnora"];
	// PATHEXT variants first (the shell resolves these), bare `elnora` (sh shim) last.
	const names: string[] = [];
	for (const raw of pathExt.split(";")) {
		const ext = raw.trim().toLowerCase();
		if (ext) names.push(`elnora${ext.startsWith(".") ? ext : `.${ext}`}`);
	}
	names.push("elnora");
	return [...new Set(names)];
}

/** The npm prefix dir of a path under a node_modules tree, else undefined. */
function npmPrefix(p: string): string | undefined {
	const n = norm(p);
	const idx = n.indexOf("/node_modules/");
	return idx > 0 ? n.slice(0, idx) : undefined;
}

function classify(realPath: string, home: string, pathMod: PathModule, installDirOverride?: string): InstallSource {
	const p = norm(realPath);
	if (p.includes("/node_modules/")) return "npm";
	// Windows global npm writes shims (elnora / .cmd / .ps1) directly in the npm
	// prefix dir (e.g. %AppData%\npm\elnora.cmd) — not under node_modules.
	if (/\/npm\/elnora[^/]*$/.test(p)) return "npm";
	if (p.includes("/cellar/") || p.includes("/homebrew/")) return "homebrew";
	if (p.endsWith(".ts") || p.endsWith(".tsx") || p.includes("/tsx/")) return "dev";
	const binDirs = [pathMod.join(home, ".elnora", "bin"), pathMod.join(home, ".local", "bin"), installDirOverride]
		.filter((d): d is string => Boolean(d))
		.map(norm);
	if (binDirs.some((d) => p === d || p.startsWith(`${d}/`))) return "binary";
	return "unknown";
}

/** Pure core — environment injected so it's testable without globals or spawns. */
export function discoverInstalls(env: DiscoverEnv): FoundInstall[] {
	// Use the path semantics of the target platform (not the runtime one) so the
	// PATH delimiter and joins are correct and the function is cross-platform testable.
	const pathMod = env.platform === "win32" ? win32 : posix;
	const dirs = env.pathVar.split(pathMod.delimiter).filter(Boolean);
	const names = candidateNames(env.platform, env.pathExt);

	// Real paths of the currently-running install (packaged binary → execPath;
	// npm/tsx → argv1 is the JS/TS entry the shim points at).
	const activeReals = new Set<string>();
	for (const candidate of [env.execPath, env.argv1]) {
		if (candidate) activeReals.add(norm(safeRealPath(candidate)));
	}
	// Windows npm shims aren't symlinks, so realpath can't match them. Match the
	// shim's directory against the npm prefix of the running cli.js instead.
	const activePrefix = npmPrefix(env.argv1) ?? npmPrefix(safeRealPath(env.argv1));

	const byReal = new Map<string, FoundInstall>();
	for (const dir of dirs) {
		// One logical install per directory: Windows npm writes elnora + .cmd +
		// .ps1 into a single dir; a packaged install writes one elnora[.exe]. Take
		// the first candidate the shell would resolve (PATHEXT order) and stop.
		let full: string | undefined;
		for (const name of names) {
			const candidate = pathMod.join(dir, name);
			try {
				if (existsSync(candidate) && statSync(candidate).isFile()) {
					full = candidate;
					break;
				}
			} catch {
				/* unreadable — skip */
			}
		}
		if (!full) continue;
		const realPath = safeRealPath(full);
		const key = norm(realPath);
		if (byReal.has(key)) continue; // dedupe symlinks/duplicates across dirs (first wins)
		const active = activeReals.has(key) || (activePrefix !== undefined && norm(dir) === activePrefix);
		byReal.set(key, {
			path: full,
			realPath,
			pathDir: dir,
			source: classify(realPath, env.home, pathMod, env.installDirOverride),
			active,
		});
	}
	return [...byReal.values()];
}

export function detectAllInstalls(): FoundInstall[] {
	return discoverInstalls({
		pathVar: process.env.PATH ?? "",
		pathExt: process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD",
		platform: process.platform,
		home: homedir(),
		execPath: process.execPath,
		argv1: process.argv[1] ?? "",
		installDirOverride: process.env.ELNORA_INSTALL_DIR,
	});
}

/** The command to remove a given install, or null when removal isn't advised (dev). */
export function uninstallCommandFor(install: FoundInstall): string | null {
	switch (install.source) {
		case "npm":
			return "npm uninstall -g @elnora-ai/cli";
		case "homebrew":
			return "brew uninstall elnora";
		case "dev":
			return null;
		default:
			return process.platform === "win32" ? `Remove-Item "${install.path}"` : `rm "${install.path}"`;
	}
}
