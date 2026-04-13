/**
 * OpenAI Codex setup — write MCP server config to ~/.codex/mcp.json.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { CODEX_DIR, fail, ok, readJsonFile, writeJsonFile } from "./common.js";

const CODEX_MCP_FILE = join(CODEX_DIR, "mcp.json");

export function setupCodex(apiKey: string): boolean {
	if (!existsSync(CODEX_DIR)) {
		console.error(fail("Codex CLI not found (~/.codex/ does not exist)"));
		console.error("");
		console.error("  Install Codex first: https://github.com/openai/codex");
		return false;
	}
	console.error(ok("Codex CLI found"));

	const config = readJsonFile(CODEX_MCP_FILE);
	if (!config.mcpServers || typeof config.mcpServers !== "object") {
		config.mcpServers = {};
	}

	(config.mcpServers as Record<string, unknown>).elnora = {
		url: "https://mcp.elnora.ai/mcp",
		headers: {
			"X-API-Key": apiKey,
		},
	};

	writeJsonFile(CODEX_MCP_FILE, config);
	console.error(ok("MCP server configured in ~/.codex/mcp.json"));

	console.error("");
	console.error("  Elnora MCP server is now available in Codex.");
	return true;
}
