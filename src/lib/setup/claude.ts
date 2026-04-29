/**
 * Claude Code setup — register the Elnora marketplace and enable the elnora
 * plugin by shelling out to `claude plugin marketplace add` and
 * `claude plugin install`.
 *
 * Why shell-outs and not direct JSON edits: writing
 * `~/.claude/plugins/known_marketplaces.json` directly requires producing all
 * schema-required fields (source + installLocation + lastUpdated) AND cloning
 * the github repo to the right path. The `claude` CLI does both correctly.
 * A partial entry (source only) fails strict-validation and breaks every other
 * registered marketplace — see ELN-669.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { CLAUDE_DIR, fail, MARKETPLACE_GITHUB_URL, ok, PLUGIN_ID } from "./common.js";

interface ExecError extends Error {
	code?: string | number;
}

/**
 * Spawn `claude` with stdio inherited — the user sees `claude`'s own progress
 * (clone, validation, success ✓) instead of a 30-120s frozen prompt. Resolves
 * on exit code 0; rejects with `code: "ENOENT"` if `claude` isn't on PATH or
 * `code: <number>` for a non-zero exit.
 *
 * `shell: true` on Windows because npm installs CLIs as `<name>.cmd` (a batch
 * file), and Node's CreateProcess-based spawn won't auto-resolve `.cmd` files
 * — only `.exe`/`.com`. Routing through `cmd.exe` makes PATHEXT do the lookup,
 * which finds both `claude.exe` (native installer) and `claude.cmd` (npm).
 * Args are hard-coded URLs/IDs, so no shell-injection surface.
 */
function runClaudeCli(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn("claude", args, {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		child.on("error", (err) => reject(err));
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			const err: ExecError = new Error(`claude ${args.join(" ")} exited with code ${code}`);
			err.code = code ?? -1;
			reject(err);
		});
	});
}

export async function setupClaude(): Promise<boolean> {
	if (!existsSync(CLAUDE_DIR)) {
		console.error(fail("Claude Code not found (~/.claude/ does not exist)"));
		console.error("");
		console.error("  Install Claude Code first: https://claude.ai/code");
		return false;
	}
	console.error(ok("Claude Code found"));

	// `claude plugin marketplace add` is idempotent: re-running on an already
	// registered marketplace refreshes from origin and exits 0.
	try {
		await runClaudeCli(["plugin", "marketplace", "add", MARKETPLACE_GITHUB_URL]);
	} catch (err) {
		return reportClaudeCliError(err, "marketplace add");
	}

	// `claude plugin install` defaults to user scope.
	try {
		await runClaudeCli(["plugin", "install", PLUGIN_ID]);
	} catch (err) {
		return reportClaudeCliError(err, "plugin install");
	}

	console.error("");
	console.error("  Elnora skills are now available in Claude Code.");
	console.error("  Restart Claude Code if it's currently running.");
	return true;
}

function reportClaudeCliError(err: unknown, step: string): false {
	const e = err as ExecError | undefined;
	if (e?.code === "ENOENT") {
		console.error("");
		console.error(fail("`claude` not found on PATH"));
		console.error("");
		console.error("  Install Claude Code first: https://claude.ai/code");
		console.error("  Then from a fresh terminal, run:");
		console.error(`    claude plugin marketplace add ${MARKETPLACE_GITHUB_URL}`);
		console.error(`    claude plugin install ${PLUGIN_ID}`);
		return false;
	}
	console.error("");
	console.error(fail(`Setup step "${step}" failed`));
	console.error("  To retry manually:");
	console.error(`    claude plugin marketplace add ${MARKETPLACE_GITHUB_URL}`);
	console.error(`    claude plugin install ${PLUGIN_ID}`);
	return false;
}
