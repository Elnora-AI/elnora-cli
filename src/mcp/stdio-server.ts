/**
 * stdio MCP transport — for local MCP clients.
 *
 * Available but not actively promoted. Uses the local profile's API key.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CommandRegistry } from "../core/registry.js";
import { resolveApiKey } from "../lib/profiles.js";
import { createElnoraServer } from "./server.js";

export async function startStdioServer(registry: CommandRegistry): Promise<void> {
	const apiKey = resolveApiKey();
	const getContext = () => ({
		apiKey,
		clientId: "stdio",
		scopes: ["*"],
	});

	const server = createElnoraServer(registry, getContext);
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
