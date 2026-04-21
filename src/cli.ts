#!/usr/bin/env node

/**
 * Elnora CLI — entry point.
 *
 * Port of: elnora-cli/src/elnora/cli.py (125 lines)
 */

import { buildProgram } from "./adapters/cli.js";
import { addCompletionCommand } from "./commands/completion.js";
import { addDoctorCommand } from "./commands/doctor.js";
import { addMcpCommands } from "./commands/mcp/serve.js";
import { addOpenCommand } from "./commands/open.js";
import { addSetupCommand } from "./commands/setup.js";
import { addUpdateCommand } from "./commands/update.js";
import { addWhoamiCommand } from "./commands/whoami.js";
import { buildRegistry } from "./core/build-registry.js";
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

// ---------------------------------------------------------------------------
// Build program and add standalone commands
// ---------------------------------------------------------------------------

const program = buildProgram(registry);

// Standalone commands (not ElnoraCommand — wired directly to Commander)
addMcpCommands(program, registry);
addDoctorCommand(program);
addWhoamiCommand(program);
addOpenCommand(program);
addSetupCommand(program);
addUpdateCommand(program);
addCompletionCommand(program);

// Background update check (non-blocking, 24h cache)
registerUpdateCheck();

program.parseAsync(process.argv);
