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
import { registerFeedbackCommands } from "./commands/feedback/index.js";
import { registerFileCommands } from "./commands/files/index.js";
import { registerFlagCommands } from "./commands/flags/index.js";
import { registerFolderCommands } from "./commands/folders/index.js";
import { healthCheck } from "./commands/health.js";
import { registerLibraryCommands } from "./commands/library/index.js";
import { addMcpCommands } from "./commands/mcp/serve.js";
import { registerOrgCommands } from "./commands/orgs/index.js";
import { registerProjectCommands } from "./commands/projects/index.js";
import { registerSearchCommands } from "./commands/search/index.js";
import { registerTaskCommands } from "./commands/tasks/index.js";
import { CommandRegistry } from "./core/registry.js";
import { formatErrorPayload, getExitCode } from "./lib/errors.js";

// ---------------------------------------------------------------------------
// Crash handler — structured JSON to stderr, never raw stack traces
// ---------------------------------------------------------------------------

process.on("uncaughtException", (err) => {
	const payload = formatErrorPayload(err);
	process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
	process.exit(getExitCode(err));
});

process.on("unhandledRejection", (reason) => {
	const err = reason instanceof Error ? reason : new Error(String(reason));
	const payload = formatErrorPayload(err);
	process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
	process.exit(1);
});

// ---------------------------------------------------------------------------
// Command registry — all commands
// ---------------------------------------------------------------------------

const registry = new CommandRegistry();

// Register all commands — each register function returns an array
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
// Build and run
// ---------------------------------------------------------------------------

const program = buildProgram(registry);

// MCP server command — not an ElnoraCommand, wired separately
addMcpCommands(program, registry);

program.parseAsync(process.argv);
