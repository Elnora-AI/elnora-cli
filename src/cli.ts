#!/usr/bin/env node

/**
 * Elnora CLI — entry point.
 *
 * Port of: elnora-cli/src/elnora/cli.py (125 lines)
 */

import { buildProgram } from "./adapters/cli.js";
import { registerAccountCommands } from "./commands/account/index.js";
import { registerApiKeyCommands } from "./commands/api-keys/index.js";
import { registerAuditCommands } from "./commands/audit/index.js";
import { registerAuthCommands } from "./commands/auth/index.js";
import { addCompletionCommand } from "./commands/completion.js";
import { addDoctorCommand } from "./commands/doctor.js";
import { registerFeedbackCommands } from "./commands/feedback/index.js";
import { registerFileCommands } from "./commands/files/index.js";
import { registerFlagCommands } from "./commands/flags/index.js";
import { registerFolderCommands } from "./commands/folders/index.js";
import { healthCheck } from "./commands/health.js";
import { registerLibraryCommands } from "./commands/library/index.js";
import { addMcpCommands } from "./commands/mcp/serve.js";
import { addOpenCommand } from "./commands/open.js";
import { registerOrgCommands } from "./commands/orgs/index.js";
import { registerProjectCommands } from "./commands/projects/index.js";
import { registerSearchCommands } from "./commands/search/index.js";
import { addSetupClaudeCommand } from "./commands/setup-claude.js";
import { registerTaskCommands } from "./commands/tasks/index.js";
import { addUpdateCommand } from "./commands/update.js";
import { addWhoamiCommand } from "./commands/whoami.js";
import { CommandRegistry } from "./core/registry.js";
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

const registry = new CommandRegistry();

const commandGroups = [
	[healthCheck],
	registerAuthCommands(),
	registerProjectCommands(),
	registerTaskCommands(),
	registerFileCommands(),
	registerOrgCommands(),
	registerFolderCommands(),
	registerSearchCommands(),
	registerLibraryCommands(),
	registerAccountCommands(),
	registerApiKeyCommands(),
	registerAuditCommands(),
	registerFeedbackCommands(),
	registerFlagCommands(),
];

for (const commands of commandGroups) {
	for (const cmd of commands) {
		registry.register(cmd);
	}
}

// ---------------------------------------------------------------------------
// Build program and add standalone commands
// ---------------------------------------------------------------------------

const program = buildProgram(registry);

// Standalone commands (not ElnoraCommand — wired directly to Commander)
addMcpCommands(program, registry);
addDoctorCommand(program);
addWhoamiCommand(program);
addOpenCommand(program);
addSetupClaudeCommand(program);
addUpdateCommand(program);
addCompletionCommand(program);

// Background update check (non-blocking, 24h cache)
registerUpdateCheck();

program.parseAsync(process.argv);
