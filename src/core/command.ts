/**
 * ElnoraCommand<I,O> — the unified interface for CLI commands, MCP tools, and skills.
 *
 * Every command is defined once with Zod schemas. Three adapters consume this:
 * - CLI adapter: Zod → Commander.js options
 * - MCP adapter: Zod → JSON Schema for MCP tool definitions
 * - Skill adapter: generates SKILL.md from description + schema
 */

import type { ZodType } from "zod";
import type { ElnoraApiClient } from "../lib/client.js";
import type { OutputFormat } from "../lib/output.js";

export type CommandMode = "cli" | "mcp";

export interface CommandContext {
	/** Authenticated API client */
	client: ElnoraApiClient;

	/** Active profile name */
	profileName: string;

	/** Execution mode — CLI renders output, MCP returns raw JSON */
	mode: CommandMode;

	/** Output preferences (CLI only) */
	output: {
		format: OutputFormat;
		compact: boolean;
		fields?: string[];
	};
}

export interface ElnoraCommand<I = unknown, O = unknown> {
	/** Command name in dot notation: "projects.create", "tasks.send" */
	name: string;

	/** Command group: "projects", "tasks", "files", etc. */
	group: string;

	/** Human-readable description (used for CLI help + MCP tool description) */
	description: string;

	/** Zod schema for input — auto-generates CLI flags + MCP JSON Schema */
	inputSchema: ZodType<I>;

	/** Zod schema for output — used for type safety + output formatting */
	outputSchema: ZodType<O>;

	/** Execute the command */
	execute(input: I, ctx: CommandContext): Promise<O>;

	/** Format output for display (CLI renders this; MCP returns raw JSON) */
	formatOutput(output: O, format: OutputFormat): string;

	/** MCP tool annotations (optional) */
	annotations?: {
		readOnlyHint?: boolean;
		destructiveHint?: boolean;
		idempotentHint?: boolean;
		/** If false, command is not exposed as an MCP tool (CLI-only). Default: true. */
		exposeInMcp?: boolean;
		/** Required OAuth scopes when this command is invoked via MCP. Empty array = public. */
		mcpScopes?: string[];
		/**
		 * Staff / SystemAdmin-only command. Excluded from the public developer
		 * portal (docs.elnora.ai) by the docs generator. Default: false.
		 */
		internal?: boolean;
	};
}
