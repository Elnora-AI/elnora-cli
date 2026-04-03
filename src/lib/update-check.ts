/**
 * Background update check — non-blocking, 24h cache.
 *
 * Port of: elnora-cli/src/elnora/lib/update_check.py (69 lines)
 * Adapted for npm registry instead of PyPI.
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

interface CacheEntry {
	checkedAt: string;
	latest: string;
}

function shouldSkip(): boolean {
	// Skip in CI
	if (process.env.CI || process.env.GITHUB_ACTIONS) return true;
	// Skip if opted out
	if (process.env.ELNORA_NO_UPDATE_CHECK) return true;
	// Skip in non-TTY (piped output)
	if (!process.stderr.isTTY) return true;
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
	const color = isColorEnabled();
	const msg = color
		? `\n${pc.yellow(`Update available: v${VERSION} → v${latest}`)}\nRun: curl -fsSL https://cli.elnora.ai/install.sh | bash\n`
		: `\nUpdate available: v${VERSION} → v${latest}\nRun: curl -fsSL https://cli.elnora.ai/install.sh | bash\n`;
	process.stderr.write(msg);
}

/**
 * Register update check to run at process exit.
 * Non-blocking — uses a fire-and-forget fetch.
 */
export function registerUpdateCheck(): void {
	if (shouldSkip()) return;

	// Check cache first
	const cached = readCache();
	if (cached) {
		const elapsed = Date.now() - new Date(cached.checkedAt).getTime();
		if (elapsed < CHECK_INTERVAL_MS) {
			// Cache is fresh — show notice if update available
			if (cached.latest && cached.latest !== VERSION && cached.latest !== "unknown") {
				// Compare versions simply — assumes semver
				if (cached.latest > VERSION) {
					showUpdateNotice(cached.latest);
				}
			}
			return;
		}
	}

	// Cache is stale or missing — fetch in background
	// Use setTimeout(0) to ensure it doesn't block the main command
	setTimeout(async () => {
		try {
			const response = await fetch(NPM_REGISTRY_URL, {
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			});
			if (!response.ok) return;
			const data = (await response.json()) as { version?: string };
			const latest = data.version ?? "unknown";

			writeCache({ checkedAt: new Date().toISOString(), latest });

			if (latest !== VERSION && latest !== "unknown" && latest > VERSION) {
				showUpdateNotice(latest);
			}
		} catch {
			// Silently ignore — never block or error on update check
		}
	}, 0);
}
