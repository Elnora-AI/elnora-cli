/**
 * Cursor setup — write MCP server config to ~/.cursor/mcp.json.
 */

import { existsSync } from "node:fs";
import { CURSOR_DIR, CURSOR_MCP_GLOBAL, fail, ok, readJsonFile, writeJsonFile } from "./common.js";

export function setupCursor(apiKey: string): boolean {
	if (!existsSync(CURSOR_DIR)) {
		console.error(fail("Cursor not found (~/.cursor/ does not exist)"));
		console.error("");
		console.error("  Install Cursor first: https://cursor.com");
		return false;
	}
	console.error(ok("Cursor found"));

	let config: Record<string, unknown>;
	try {
		config = readJsonFile(CURSOR_MCP_GLOBAL);
	} catch (err) {
		console.error(fail(err instanceof Error ? err.message : String(err)));
		console.error("  Repair or delete the file and retry.");
		return false;
	}
	if (!config.mcpServers || typeof config.mcpServers !== "object") {
		config.mcpServers = {};
	}

	(config.mcpServers as Record<string, unknown>).elnora = {
		url: "https://mcp.elnora.ai/mcp",
		headers: {
			"X-API-Key": apiKey,
		},
	};

	writeJsonFile(CURSOR_MCP_GLOBAL, config);
	console.error(ok("MCP server configured in ~/.cursor/mcp.json"));

	console.error("");
	console.error("  Elnora MCP server is now available in Cursor.");
	console.error("  Restart Cursor if it's currently running.");
	return true;
}
