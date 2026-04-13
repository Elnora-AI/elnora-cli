/**
 * Claude Code setup — register elnora-plugins as a GitHub marketplace.
 */

import { existsSync } from "node:fs";
import {
	CLAUDE_DIR,
	CLAUDE_MARKETPLACES_FILE,
	CLAUDE_SETTINGS_FILE,
	fail,
	LEGACY_MARKETPLACE_NAMES,
	LEGACY_PLUGIN_IDS,
	MARKETPLACE_NAME,
	MARKETPLACE_REPO,
	ok,
	PLUGIN_ID,
	readJsonFile,
	writeJsonFile,
} from "./common.js";

export function setupClaude(): boolean {
	// 1. Check Claude Code is installed
	if (!existsSync(CLAUDE_DIR)) {
		console.error(fail("Claude Code not found (~/.claude/ does not exist)"));
		console.error("");
		console.error("  Install Claude Code first: https://claude.ai/code");
		return false;
	}
	console.error(ok("Claude Code found"));

	// 2. Register GitHub marketplace in known_marketplaces.json
	const marketplaces = readJsonFile(CLAUDE_MARKETPLACES_FILE);

	// Clean up legacy entries
	for (const old of LEGACY_MARKETPLACE_NAMES) {
		delete marketplaces[old];
	}

	marketplaces[MARKETPLACE_NAME] = {
		source: {
			source: "github",
			repo: MARKETPLACE_REPO,
		},
	};
	writeJsonFile(CLAUDE_MARKETPLACES_FILE, marketplaces);
	console.error(ok(`Marketplace registered (GitHub: ${MARKETPLACE_REPO})`));

	// 3. Enable the plugin globally
	const settings = readJsonFile(CLAUDE_SETTINGS_FILE);
	if (!settings.enabledPlugins || typeof settings.enabledPlugins !== "object") {
		settings.enabledPlugins = {};
	}
	const plugins = settings.enabledPlugins as Record<string, boolean>;

	// Clean up legacy plugin IDs
	for (const old of LEGACY_PLUGIN_IDS) {
		delete plugins[old];
	}

	plugins[PLUGIN_ID] = true;
	writeJsonFile(CLAUDE_SETTINGS_FILE, settings);
	console.error(ok(`Plugin enabled (${PLUGIN_ID})`));

	console.error("");
	console.error("  Elnora skills are now available in Claude Code.");
	console.error("  Restart Claude Code if it's currently running.");
	return true;
}
