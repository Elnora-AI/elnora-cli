/**
 * Shared helpers for platform setup commands.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import pc from "picocolors";
import { isColorEnabled } from "../tty.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const HOME = homedir();
export const ELNORA_DIR = join(HOME, ".elnora");

// Claude Code
export const CLAUDE_DIR = join(HOME, ".claude");
export const CLAUDE_MARKETPLACES_FILE = join(CLAUDE_DIR, "plugins", "known_marketplaces.json");
export const CLAUDE_SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");

// Cursor
export const CURSOR_DIR = join(HOME, ".cursor");
export const CURSOR_MCP_GLOBAL = join(HOME, ".cursor", "mcp.json");

// VS Code
export const VSCODE_DIR = join(HOME, ".vscode");

// Codex
export const CODEX_DIR = join(HOME, ".codex");

// ---------------------------------------------------------------------------
// Marketplace / Plugin IDs
// ---------------------------------------------------------------------------

export const MARKETPLACE_NAME = "elnora-plugins";
export const MARKETPLACE_REPO = "Elnora-AI/elnora-plugins";
export const MARKETPLACE_GITHUB_URL = `https://github.com/${MARKETPLACE_REPO}`;
export const PLUGIN_ID = `elnora@${MARKETPLACE_NAME}`;

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

/**
 * Read and parse a JSON config file.
 *
 * Missing file returns `{}` so callers can append a fresh config.
 * Existing-but-corrupt throws — the previous swallow-and-return-{} masked the
 * upstream cause of ELN-669, where a partial known_marketplaces.json entry
 * silently triggered a clobbering rewrite instead of a clear error.
 */
export function readJsonFile(path: string): Record<string, unknown> {
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		throw new Error(`Cannot parse JSON config at ${path}: ${reason}`);
	}
}

export function writeJsonFile(path: string, data: unknown): void {
	mkdirSync(join(path, ".."), { recursive: true });
	writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

const color = isColorEnabled();

export function ok(msg: string): string {
	return color ? `  ${pc.green("✓")} ${msg}` : `  ✓ ${msg}`;
}

export function fail(msg: string): string {
	return color ? `  ${pc.red("✗")} ${msg}` : `  ✗ ${msg}`;
}

export function info(msg: string): string {
	return color ? `  ${pc.dim(msg)}` : `  ${msg}`;
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

export interface DetectedPlatform {
	name: string;
	label: string;
	installed: boolean;
}

export function detectPlatforms(): DetectedPlatform[] {
	return [
		{ name: "claude", label: "Claude Code", installed: existsSync(CLAUDE_DIR) },
		{ name: "cursor", label: "Cursor", installed: existsSync(CURSOR_DIR) },
		{ name: "vscode", label: "VS Code", installed: existsSync(VSCODE_DIR) },
		{ name: "codex", label: "OpenAI Codex", installed: existsSync(CODEX_DIR) },
	];
}
