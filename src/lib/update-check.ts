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
import { isColorEnabled } from "./tty.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@elnora-ai/cli/latest";
const CACHE_DIR = join(homedir(), ".elnora");
const CACHE_FILE = join(CACHE_DIR, ".update-check");
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3000;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;

interface CacheEntry {
	checkedAt: string;
	latest: string;
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

function showUpdateNotice(latest: string): void {
	// Only show in TTY
	if (!process.stderr.isTTY) return;

	const color = isColorEnabled();
	const msg = color
		? `\n${pc.yellow(`Update available: v${VERSION} → v${latest}`)}\nRun: elnora update\n`
		: `\nUpdate available: v${VERSION} → v${latest}\nRun: elnora update\n`;
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
export function registerUpdateCheck(): void {
	if (shouldSkipEntirely()) return;

	// Check cache first
	const cached = readCache();
	if (cached) {
		const elapsed = Date.now() - new Date(cached.checkedAt).getTime();
		if (elapsed < CHECK_INTERVAL_MS) {
			// Cache is fresh — show notice if update available
			if (cached.latest && cached.latest !== VERSION && cached.latest !== "unknown") {
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
			const latest = data.version ?? "unknown";

			if (latest !== "unknown" && !SEMVER_RE.test(latest)) return;

			writeCache({ checkedAt: new Date().toISOString(), latest });

			if (latest !== VERSION && latest !== "unknown" && isNewerVersion(latest, VERSION)) {
				showUpdateNotice(latest);
			}
		} catch {
			// Silently ignore
		} finally {
			clearInterval(keepAlive);
		}
	})();
}
