/**
 * elnora setup-claude — register Elnora skills as a Claude Code plugin.
 *
 * Copies bundled skills to ~/.elnora/plugin/ and registers the plugin
 * in Claude Code's configuration so skills are available in all projects.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { VERSION } from "../lib/config.js";
import { isColorEnabled } from "../lib/tty.js";

const ELNORA_DIR = join(homedir(), ".elnora");
const PLUGIN_DIR = join(ELNORA_DIR, "plugin", "elnora");
const CLAUDE_DIR = join(homedir(), ".claude");
const MARKETPLACES_FILE = join(CLAUDE_DIR, "plugins", "known_marketplaces.json");
const SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");

const MARKETPLACE_NAME = "elnora-local";
const PLUGIN_ID = `elnora@${MARKETPLACE_NAME}`;

function findSkillsDir(): string | null {
	// When installed via npm: skills/ is next to dist/
	const candidates = [
		join(__dirname, "../../skills"),
		join(__dirname, "../skills"),
		// When running from source via tsx
		join(__dirname, "../../../skills"),
		// Standalone binary: skills extracted to ~/.elnora/skills/
		join(ELNORA_DIR, "skills"),
	];
	for (const dir of candidates) {
		if (existsSync(join(dir, "elnora-platform", "SKILL.md"))) {
			return dir;
		}
	}
	return null;
}

function readJsonFile(path: string): Record<string, unknown> {
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function writeJsonFile(path: string, data: unknown): void {
	mkdirSync(join(path, ".."), { recursive: true });
	writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export function addSetupClaudeCommand(program: Command): void {
	program
		.command("setup-claude")
		.description("Install Elnora skills for Claude Code")
		.action(() => {
			const color = isColorEnabled();
			const ok = (msg: string) => (color ? `  ${pc.green("✓")} ${msg}` : `  ✓ ${msg}`);
			const fail = (msg: string) => (color ? `  ${pc.red("✗")} ${msg}` : `  ✗ ${msg}`);

			console.error("");

			// 1. Check Claude Code is installed
			if (!existsSync(CLAUDE_DIR)) {
				console.error(fail("Claude Code not found (~/.claude/ does not exist)"));
				console.error("");
				console.error("  Install Claude Code first: https://claude.ai/code");
				process.exit(1);
			}
			console.error(ok("Claude Code found"));

			// 2. Find bundled skills
			const skillsDir = findSkillsDir();
			if (!skillsDir) {
				console.error(fail("Skills not found"));
				console.error("");
				console.error("  Skills may not be bundled with your install method.");
				console.error("  Try: npm install -g @elnora-ai/cli");
				process.exit(1);
			}
			console.error(ok(`Skills found at ${skillsDir}`));

			// 3. Copy skills to ~/.elnora/plugin/elnora/skills/
			mkdirSync(PLUGIN_DIR, { recursive: true });

			// Write plugin.json
			writeJsonFile(join(PLUGIN_DIR, ".claude-plugin", "plugin.json"), {
				name: "elnora",
				version: VERSION,
				description:
					"AI-powered bioprotocol generation and lab workflow management. Connect to the Elnora AI Platform to generate, optimize, and manage bioprotocols.",
				author: { name: "Elnora AI", url: "https://elnora.ai" },
				repository: "https://github.com/Elnora-AI/elnora-cli",
				homepage: "https://elnora.ai",
				license: "Apache-2.0",
				keywords: ["bioprotocol", "lab", "pharma", "life-sciences"],
			});

			// Copy skills
			cpSync(skillsDir, join(PLUGIN_DIR, "skills"), { recursive: true });
			console.error(ok("Skills installed to ~/.elnora/plugin/"));

			// 4. Register marketplace in Claude Code
			const marketplaces = readJsonFile(MARKETPLACES_FILE);
			marketplaces[MARKETPLACE_NAME] = {
				source: {
					source: "directory",
					path: join(ELNORA_DIR, "plugin"),
				},
				installLocation: join(ELNORA_DIR, "plugin"),
				lastUpdated: new Date().toISOString(),
			};
			writeJsonFile(MARKETPLACES_FILE, marketplaces);
			console.error(ok("Marketplace registered in Claude Code"));

			// 5. Enable the plugin globally
			const settings = readJsonFile(SETTINGS_FILE);
			if (!settings.enabledPlugins || typeof settings.enabledPlugins !== "object") {
				settings.enabledPlugins = {};
			}
			(settings.enabledPlugins as Record<string, boolean>)[PLUGIN_ID] = true;
			writeJsonFile(SETTINGS_FILE, settings);
			console.error(ok("Plugin enabled"));

			console.error("");
			console.error("  Elnora skills are now available in Claude Code.");
			console.error("  Restart Claude Code if it's currently running.");
			console.error("");
		});
}
