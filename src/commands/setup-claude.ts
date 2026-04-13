/**
 * elnora setup-claude — backward-compat alias for `elnora setup claude`.
 */

import type { Command } from "commander";
import { setupClaude } from "../lib/setup/claude.js";

export function addSetupClaudeCommand(program: Command): void {
	program
		.command("setup-claude")
		.description("Set up Claude Code (alias for 'setup claude')")
		.action(() => {
			console.error("");
			const success = setupClaude();
			if (!success) process.exitCode = 1;
			console.error("");
		});
}
