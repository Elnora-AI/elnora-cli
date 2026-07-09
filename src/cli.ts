#!/usr/bin/env node

/**
 * Elnora CLI — entry point.
 *
 * Port of: elnora-cli/src/elnora/cli.py (125 lines)
 */

import { buildProgram } from "./adapters/cli.js";
import { addCompletionCommand } from "./commands/completion.js";
import { addConfigCommand } from "./commands/config.js";
import { addDoctorCommand } from "./commands/doctor.js";
import { addMcpCommands } from "./commands/mcp/serve.js";
import { addOpenCommand } from "./commands/open.js";
import { addSetupCommand } from "./commands/setup.js";
import { addUpdateCommand } from "./commands/update.js";
import { addWhoamiCommand } from "./commands/whoami.js";
import { buildRegistry } from "./core/build-registry.js";
import { maybePrintBanner } from "./lib/banner.js";
import { formatErrorForHuman, formatErrorPayload, getExitCode } from "./lib/errors.js";
import { registerUpdateCheck } from "./lib/update-check.js";

// ---------------------------------------------------------------------------
// Crash handler — structured JSON to stderr, never raw stack traces
// ---------------------------------------------------------------------------

process.on("uncaughtException", (err) => {
	if (process.stderr.isTTY) {
		process.stderr.write(`${formatErrorForHuman(err)}\n`);
	} else {
		process.stderr.write(`${JSON.stringify(formatErrorPayload(err), null, 2)}\n`);
	}
	process.exitCode = getExitCode(err);
});

process.on("unhandledRejection", (reason) => {
	const err = reason instanceof Error ? reason : new Error(String(reason));
	if (process.stderr.isTTY) {
		process.stderr.write(`${formatErrorForHuman(err)}\n`);
	} else {
		process.stderr.write(`${JSON.stringify(formatErrorPayload(err), null, 2)}\n`);
	}
	process.exitCode = 1;
});

// ---------------------------------------------------------------------------
// Command registry — all ElnoraCommand instances
// ---------------------------------------------------------------------------

const registry = buildRegistry();

// Honor cross-cutting global flags before Commander parses, so they also apply
// to the background update notice (registered below) and any color resolution.
// --no-color maps to the NO_COLOR convention; --quiet silences the update nag.
if (process.argv.includes("--no-color") && !process.env.NO_COLOR) {
	process.env.NO_COLOR = "1";
}
const quiet = process.argv.includes("--quiet");

// Branded banner on bare `elnora` / top-level --help (TTY only; never piped, in
// CI, with --quiet, or before a subcommand). Goes to stderr so stdout stays clean.
maybePrintBanner(process.argv);

// ---------------------------------------------------------------------------
// Build program and add standalone commands
// ---------------------------------------------------------------------------

const program = buildProgram(registry);

// Standalone commands (not ElnoraCommand — wired directly to Commander)
addMcpCommands(program, registry);
addDoctorCommand(program);
addWhoamiCommand(program);
addConfigCommand(program);
addOpenCommand(program);
addSetupCommand(program);
addUpdateCommand(program);
addCompletionCommand(program);

// Background update check (non-blocking, 24h cache). Suppressed by --quiet.
registerUpdateCheck(quiet);

program.parseAsync(process.argv);
