/**
 * MCP adapter — converts ElnoraCommand<I,O> definitions to MCP tool definitions.
 *
 * Tool naming convention: elnora_<group>_<action>
 * Example: "projects.create" → "elnora_projects_create"
 */

import { z } from "zod";
import type { ElnoraCommand } from "../core/command.js";
import type { CommandRegistry } from "../core/registry.js";

export interface McpToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations?: {
		readOnlyHint?: boolean;
		destructiveHint?: boolean;
		idempotentHint?: boolean;
	};
}

/**
 * Convert an ElnoraCommand to an MCP tool definition.
 */
export function commandToMcpTool(command: ElnoraCommand): McpToolDefinition {
	const name = `elnora_${command.name.replace(/\./g, "_")}`;

	const jsonSchema = z.toJSONSchema(command.inputSchema) as Record<string, unknown>;

	// Remove meta fields MCP doesn't need
	delete jsonSchema.$schema;

	return {
		name,
		description: command.description,
		inputSchema: jsonSchema,
		annotations: command.annotations,
	};
}

/**
 * Convert all commands in a registry to MCP tool definitions.
 *
 * Commands with `annotations.exposeInMcp: false` are excluded (CLI-only).
 */
export function registryToMcpTools(registry: CommandRegistry): McpToolDefinition[] {
	return registry
		.all()
		.filter((cmd) => cmd.annotations?.exposeInMcp !== false)
		.map(commandToMcpTool);
}
