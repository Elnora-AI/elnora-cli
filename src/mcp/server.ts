/**
 * MCP server core — auto-registers all ElnoraCommands as MCP tools.
 *
 * Replaces the 3,766 lines of hand-written tool registrations in elnora-mcp-server.
 * The command registry drives everything — adding a command in Phase 2 automatically
 * exposes it as an MCP tool.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CommandContext } from "../core/command.js";
import type { CommandRegistry } from "../core/registry.js";
import { ElnoraApiClient } from "../lib/client.js";
import { VERSION } from "../lib/config.js";
import { formatErrorPayload } from "../lib/errors.js";

export interface McpRequestContext {
	apiKey?: string;
	bearerToken?: string;
	clientId: string;
	scopes: string[];
}

export function createElnoraServer(registry: CommandRegistry, getContext: () => McpRequestContext): McpServer {
	const server = new McpServer({ name: "elnora", version: VERSION });

	for (const command of registry.all()) {
		const toolName = `elnora_${command.name.replace(/\./g, "_")}`;

		// MCP SDK v1.29+ accepts Zod schemas directly — no JSON Schema conversion needed
		server.registerTool(
			toolName,
			{
				title: toolName,
				description: command.description,
				inputSchema: command.inputSchema,
				annotations: {
					readOnlyHint: command.annotations?.readOnlyHint ?? false,
					destructiveHint: command.annotations?.destructiveHint ?? false,
					idempotentHint: command.annotations?.idempotentHint ?? false,
				},
			},
			async (params) => {
				try {
					const ctx = getContext();
					const client = new ElnoraApiClient(ctx.apiKey ?? ctx.bearerToken ?? "");

					const input = command.inputSchema.parse(params);
					const commandCtx: CommandContext = {
						client,
						profileName: "mcp",
						mode: "mcp",
						output: { format: "json", compact: false },
					};

					const result = await command.execute(input, commandCtx);
					return {
						content: [{ type: "text" as const, text: JSON.stringify(result) }],
					};
				} catch (error) {
					const payload = formatErrorPayload(error instanceof Error ? error : new Error(String(error)));
					return {
						content: [{ type: "text" as const, text: JSON.stringify(payload) }],
						isError: true,
					};
				}
			},
		);
	}

	return server;
}
