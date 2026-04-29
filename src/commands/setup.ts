/**
 * elnora setup — configure AI coding tools to use Elnora.
 *
 * Claude Code gets skills (via marketplace plugin) + MCP server.
 * Other platforms (Cursor, VS Code, Codex) get MCP server config only.
 */

import type { Command } from "commander";
import { resolveApiKey } from "../lib/profiles.js";
import { setupClaude } from "../lib/setup/claude.js";
import { setupCodex } from "../lib/setup/codex.js";
import { detectPlatforms, fail, info, ok } from "../lib/setup/common.js";
import { setupCursor } from "../lib/setup/cursor.js";
import { setupVscode } from "../lib/setup/vscode.js";

type PlatformName = "claude" | "cursor" | "vscode" | "codex";

const PLATFORM_SETUP: Record<PlatformName, (apiKey: string) => Promise<boolean>> = {
	claude: () => setupClaude(),
	cursor: async (key) => setupCursor(key),
	vscode: async (key) => setupVscode(key),
	codex: async (key) => setupCodex(key),
};

async function runSetup(platforms: PlatformName[], profileName: string): Promise<void> {
	// Resolve API key once (needed for MCP config on non-Claude platforms)
	let apiKey: string | undefined;
	const needsKey = platforms.some((p) => p !== "claude");
	if (needsKey) {
		try {
			apiKey = resolveApiKey(profileName);
		} catch {
			// API key not available — Claude-only setup can still proceed
			if (platforms.every((p) => p !== "claude")) {
				console.error(fail("No API key found. Run 'elnora auth login' first."));
				process.exitCode = 1;
				return;
			}
		}
	}

	let anyFailed = false;
	for (const platform of platforms) {
		const setupFn = PLATFORM_SETUP[platform];
		const success = await setupFn(apiKey ?? "");
		if (!success) anyFailed = true;
		console.error("");
	}

	if (anyFailed) {
		process.exitCode = 1;
	}
}

export function addSetupCommand(program: Command): void {
	const setup = program
		.command("setup")
		.description("Configure AI coding tools to use Elnora")
		.option("--profile <name>", "API key profile to use", "default");

	// Subcommands for specific platforms
	setup
		.command("claude")
		.description("Set up Claude Code (skills + MCP server)")
		.action(async () => {
			const opts = setup.opts<{ profile: string }>();
			console.error("");
			await runSetup(["claude"], opts.profile);
		});

	setup
		.command("cursor")
		.description("Set up Cursor (MCP server)")
		.action(async () => {
			const opts = setup.opts<{ profile: string }>();
			console.error("");
			await runSetup(["cursor"], opts.profile);
		});

	setup
		.command("vscode")
		.description("Set up VS Code Copilot (MCP server)")
		.action(async () => {
			const opts = setup.opts<{ profile: string }>();
			console.error("");
			await runSetup(["vscode"], opts.profile);
		});

	setup
		.command("codex")
		.description("Set up OpenAI Codex (MCP server)")
		.action(async () => {
			const opts = setup.opts<{ profile: string }>();
			console.error("");
			await runSetup(["codex"], opts.profile);
		});

	// Default: auto-detect installed platforms
	setup.action(async () => {
		const opts = setup.opts<{ profile: string }>();
		console.error("");

		const detected = detectPlatforms();
		const installed = detected.filter((p) => p.installed);

		if (installed.length === 0) {
			console.error(fail("No supported AI coding tools detected."));
			console.error("");
			console.error("  Supported: Claude Code, Cursor, VS Code, OpenAI Codex");
			console.error("  Install one first, then run 'elnora setup' again.");
			process.exitCode = 1;
			return;
		}

		console.error(ok(`Detected ${installed.length} platform(s):`));
		for (const p of installed) {
			console.error(info(`${p.label}`));
		}
		console.error("");

		const platforms = installed.map((p) => p.name as PlatformName);
		await runSetup(platforms, opts.profile);
	});

	// Top-level alias: `elnora setup-claude` → `elnora setup claude`
	program
		.command("setup-claude")
		.description("Set up Claude Code (alias for 'setup claude')")
		.option("--profile <name>", "API key profile to use", "default")
		.action(async (opts: { profile: string }) => {
			console.error("");
			await runSetup(["claude"], opts.profile);
		});
}
