/**
 * `elnora mcp serve` — start MCP server exposing all CLI commands as tools.
 *
 * This is NOT an ElnoraCommand — it's a Commander.js command that starts
 * a server process. It doesn't call the Elnora API, it becomes a server.
 */

import type { Command } from "commander";
import type { CommandRegistry } from "../../core/registry.js";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Required environment variable ${name} is not set`);
	}
	return value;
}

export function addMcpCommands(program: Command, registry: CommandRegistry): void {
	const mcp = program.command("mcp").description("MCP server management");

	mcp
		.command("serve")
		.description("Start MCP server exposing all CLI commands as tools")
		.option("--http", "HTTP transport (default, for deployment)")
		.option("--stdio", "stdio transport (for local MCP clients)")
		.option("--port <port>", "HTTP port", process.env.PORT ?? "3000")
		.option("--host <host>", "HTTP bind address", process.env.HOST ?? "0.0.0.0")
		.action(async (opts) => {
			if (opts.stdio) {
				const { startStdioServer } = await import("../../mcp/stdio-server.js");
				await startStdioServer(registry);
			} else {
				const { startHttpServer } = await import("../../mcp/http-server.js");
				await startHttpServer(registry, {
					port: Number.parseInt(opts.port, 10),
					host: opts.host,
					tokenValidationUrl: requireEnv("ELNORA_TOKEN_VALIDATION_URL"),
					mcpServiceKey: requireEnv("ELNORA_MCP_SERVICE_KEY"),
				});
			}
		});
}
