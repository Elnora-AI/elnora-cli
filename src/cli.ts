#!/usr/bin/env node

/**
 * Elnora CLI — entry point.
 *
 * Port of: elnora-cli/src/elnora/cli.py (125 lines)
 */

import { ElnoraError, formatErrorPayload, getExitCode, scrub } from "./lib/errors.js";
import { CommandRegistry } from "./core/registry.js";
import { buildProgram } from "./adapters/cli.js";

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
// Command registry
// ---------------------------------------------------------------------------

const registry = new CommandRegistry();

// Register commands — Phase 2 will add all 94 commands here
import { healthCheck } from "./commands/health.js";
registry.register(healthCheck);

// ---------------------------------------------------------------------------
// Build and run
// ---------------------------------------------------------------------------

const program = buildProgram(registry);
program.parseAsync(process.argv);
