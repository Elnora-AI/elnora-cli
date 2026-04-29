/**
 * VS Code setup — write MCP server config to ~/.vscode/mcp.json.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fail, HOME, ok, readJsonFile, VSCODE_DIR, writeJsonFile } from "./common.js";

const VSCODE_MCP_GLOBAL = join(HOME, ".vscode", "mcp.json");

export function setupVscode(apiKey: string): boolean {
	if (!existsSync(VSCODE_DIR)) {
		console.error(fail("VS Code not found (~/.vscode/ does not exist)"));
		console.error("");
		console.error("  Install VS Code first: https://code.visualstudio.com");
		return false;
	}
	console.error(ok("VS Code found"));

	let config: Record<string, unknown>;
	try {
		config = readJsonFile(VSCODE_MCP_GLOBAL);
	} catch (err) {
		console.error(fail(err instanceof Error ? err.message : String(err)));
		console.error("  Repair or delete the file and retry.");
		return false;
	}
	if (!config.servers || typeof config.servers !== "object") {
		config.servers = {};
	}

	(config.servers as Record<string, unknown>).elnora = {
		type: "http",
		url: "https://mcp.elnora.ai/mcp",
		headers: {
			"X-API-Key": apiKey,
		},
	};

	writeJsonFile(VSCODE_MCP_GLOBAL, config);
	console.error(ok("MCP server configured in ~/.vscode/mcp.json"));

	console.error("");
	console.error("  Elnora MCP server is now available in VS Code Copilot.");
	console.error("  Restart VS Code if it's currently running.");
	return true;
}
