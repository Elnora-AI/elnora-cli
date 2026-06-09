/**
 * Background update check — non-blocking, 24h cache.
 *
 * The cache refresh always runs (even in non-TTY) so that the next
 * interactive session has fresh data. The notification is only shown
 * in TTY contexts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import pc from "picocolors";
import { VERSION } from "./config.js";
import { detectInstallMethod, getUpdateInstruction } from "./install-method.js";
import { isColorEnabled } from "./tty.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@elnora-ai/cli/latest";
const CACHE_DIR = join(homedir(), ".elnora");
const CACHE_FILE = join(CACHE_DIR, ".update-check");
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3000;

interface CacheEntry {
	checkedAt: string;
	latest: string;
}

/**
 * Validate and canonicalize a version string from the npm registry. Returns a
 * clean MAJOR.MINOR.PATCH rebuilt from numeric parts via Number() — so untrusted
 * network data is never written verbatim to the cache file — or null if the value
 * isn't a plain release version. Exported for testing.
 */
export function sanitizeVersion(raw: string): string | null {
	const m = /^(\d{1,9})\.(\d{1,9})\.(\d{1,9})$/.exec(raw);
	if (!m) return null;
	return `${Number(m[1])}.${Number(m[2])}.${Number(m[3])}`;
}

function shouldSkipEntirely(): boolean {
	if (process.env.CI || process.env.GITHUB_ACTIONS) return true;
	if (process.env.ELNORA_NO_UPDATE_CHECK) return true;
	return false;
}

function readCache(): CacheEntry | null {
	try {
		if (!existsSync(CACHE_FILE)) return null;
		const raw = readFileSync(CACHE_FILE, "utf-8");
		return JSON.parse(raw) as CacheEntry;
	} catch {
		return null;
	}
}

function writeCache(entry: CacheEntry): void {
	try {
		mkdirSync(CACHE_DIR, { recursive: true });
		writeFileSync(CACHE_FILE, JSON.stringify(entry), "utf-8");
	} catch {
		// Silently ignore write errors
	}
}

/** Exported for testing. Writes the update banner with the install-aware command. */
export function showUpdateNotice(latest: string): void {
	// Only show in TTY
	if (!process.stderr.isTTY) return;

	// Advertise the command that actually installs the update, routed by how the
	// CLI was installed (npm / Homebrew / binary). Previously this always said
	// "elnora update", which only *checks* — the wrong command for every channel.
	const command = getUpdateInstruction(detectInstallMethod());
	const color = isColorEnabled();
	const head = `Update available: v${VERSION} → v${latest}`;
	const msg = color ? `\n${pc.yellow(head)}\nRun: ${command}\n` : `\n${head}\nRun: ${command}\n`;
	process.stderr.write(msg);
}

/** Simple semver comparison — returns true if a is newer than b. */
export function isNewerVersion(a: string, b: string): boolean {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const na = pa[i] ?? 0;
		const nb = pb[i] ?? 0;
		if (na > nb) return true;
		if (na < nb) return false;
	}
	return false;
}

/**
 * Register update check to run at process exit.
 * Cache refresh runs even in non-TTY; notification only in TTY.
 */
export function registerUpdateCheck(quiet = false): void {
	if (shouldSkipEntirely()) return;

	// Check cache first
	const cached = readCache();
	if (cached) {
		const elapsed = Date.now() - new Date(cached.checkedAt).getTime();
		if (elapsed < CHECK_INTERVAL_MS) {
			// Cache is fresh — show notice if update available (unless --quiet)
			if (!quiet && cached.latest && cached.latest !== VERSION && cached.latest !== "unknown") {
				if (isNewerVersion(cached.latest, VERSION)) {
					showUpdateNotice(cached.latest);
				}
			}
			return;
		}
	}

	// Cache is stale or missing — fetch in background.
	// Keep the process alive with a ref'd timer until the fetch completes
	// (bounded by FETCH_TIMEOUT_MS = 3s so it never hangs).
	const keepAlive = setInterval(() => {}, 60_000);

	(async () => {
		try {
			const response = await fetch(NPM_REGISTRY_URL, {
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			});
			if (!response.ok) return;
			const data = (await response.json()) as { version?: string };
			// Sanitize the registry value before it touches disk: rebuild from numeric
			// parts so untrusted network data is never written verbatim to the cache file.
			const latest = data.version ? sanitizeVersion(data.version) : null;
			if (!latest) return;

			writeCache({ checkedAt: new Date().toISOString(), latest });

			if (!quiet && latest !== VERSION && isNewerVersion(latest, VERSION)) {
				showUpdateNotice(latest);
			}
		} catch {
			// Silently ignore
		} finally {
			clearInterval(keepAlive);
		}
	})();
}
