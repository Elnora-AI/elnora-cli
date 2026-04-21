/**
 * MCP parity audit — compares CLI command registry against elnora-mcp-server tools.
 *
 * Modes:
 *   - sibling (default): parses TypeScript source of ../elnora-mcp-server/src/tools/**
 *   - live: calls https://mcp.elnora.ai/mcp (or configured URL) tools/list over HTTP
 *
 * Usage:
 *   tsx scripts/audit-mcp-parity.ts
 *   tsx scripts/audit-mcp-parity.ts --sibling-path ../elnora-mcp-server
 *   tsx scripts/audit-mcp-parity.ts --live https://mcp.elnora.ai/mcp --header "X-API-Key: $KEY"
 *
 * Exit 0 if parity is clean, exit 1 on drift.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { buildRegistry } from "../src/core/build-registry.js";

export interface ToolInfo {
	name: string;
	description: string;
	params: string[];
}

export interface Diff {
	missingInMcp: string[];
	extraInMcp: string[];
	paramMismatches: { tool: string; cli: string[]; mcp: string[] }[];
	descriptionMismatches: { tool: string; cli: string; mcp: string }[];
}

const IGNORED_PARAMS = new Set(["compact", "fields"]);

export function buildCliToolList(): ToolInfo[] {
	const registry = buildRegistry();
	return registry
		.all()
		.filter((cmd) => cmd.annotations?.exposeInMcp !== false)
		.map((cmd) => {
			const name = `elnora_${cmd.name.replace(/\./g, "_")}`;
			const jsonSchema = z.toJSONSchema(cmd.inputSchema as z.ZodType) as { properties?: Record<string, unknown> };
			const params = Object.keys(jsonSchema.properties ?? {})
				.filter((p) => !IGNORED_PARAMS.has(p))
				.sort();
			return { name, description: cmd.description, params };
		});
}

export function parseMcpServerSource(src: string): ToolInfo[] {
	const tools: ToolInfo[] = [];
	const toolRegex = /server\.registerTool\s*\(\s*"([^"]+)"\s*,\s*(\{[\s\S]*?\})\s*,\s*withGuard/g;

	let match: RegExpExecArray | null = toolRegex.exec(src);
	while (match !== null) {
		const name = match[1];
		const configBlock = match[2];

		const descMatch = configBlock.match(/description:\s*"((?:\\.|[^"\\])*)"/);
		const description = descMatch ? descMatch[1].replace(/\\"/g, '"') : "";

		const params = extractInputSchemaParams(configBlock);

		tools.push({ name, description, params: params.sort() });
		match = toolRegex.exec(src);
	}

	return tools;
}

function extractInputSchemaParams(configBlock: string): string[] {
	const anchor = configBlock.indexOf("inputSchema:");
	if (anchor === -1) return [];
	const openBrace = configBlock.indexOf("{", anchor);
	if (openBrace === -1) return [];

	let depth = 1;
	let i = openBrace + 1;
	while (i < configBlock.length && depth > 0) {
		const ch = configBlock[i];
		if (ch === "{") depth++;
		else if (ch === "}") depth--;
		i++;
	}
	const schemaBody = configBlock.slice(openBrace + 1, i - 1);

	const params: string[] = [];
	const paramRegex = /^\s*(\w+)\s*:\s*z\./gm;
	let pm: RegExpExecArray | null = paramRegex.exec(schemaBody);
	while (pm !== null) {
		if (!IGNORED_PARAMS.has(pm[1])) {
			params.push(pm[1]);
		}
		pm = paramRegex.exec(schemaBody);
	}
	return params;
}

export function parseMcpServerSibling(rootDir: string): ToolInfo[] {
	const tools: ToolInfo[] = [];
	for (const file of walkTsFiles(rootDir)) {
		const src = readFileSync(file, "utf-8");
		tools.push(...parseMcpServerSource(src));
	}
	return tools;
}

function walkTsFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...walkTsFiles(full));
		} else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
			out.push(full);
		}
	}
	return out;
}

export async function fetchLiveMcpTools(url: string, headers: Record<string, string> = {}): Promise<ToolInfo[]> {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
			...headers,
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/list",
			params: {},
		}),
	});
	if (!response.ok) {
		throw new Error(`MCP server returned ${response.status} ${response.statusText}`);
	}
	const data = (await response.json()) as {
		result?: {
			tools: { name: string; description?: string; inputSchema?: { properties?: Record<string, unknown> } }[];
		};
	};
	const list = data.result?.tools ?? [];
	return list.map((t) => ({
		name: t.name,
		description: t.description ?? "",
		params: Object.keys(t.inputSchema?.properties ?? {})
			.filter((p) => !IGNORED_PARAMS.has(p))
			.sort(),
	}));
}

export function diffToolSets(cli: ToolInfo[], mcp: ToolInfo[]): Diff {
	const cliByName = new Map(cli.map((t) => [t.name, t]));
	const mcpByName = new Map(mcp.map((t) => [t.name, t]));

	const missingInMcp = cli.filter((t) => !mcpByName.has(t.name)).map((t) => t.name);
	const extraInMcp = mcp.filter((t) => !cliByName.has(t.name)).map((t) => t.name);
	const paramMismatches: Diff["paramMismatches"] = [];
	const descriptionMismatches: Diff["descriptionMismatches"] = [];

	for (const cliTool of cli) {
		const mcpTool = mcpByName.get(cliTool.name);
		if (!mcpTool) continue;
		const cliParams = cliTool.params.filter((p) => !IGNORED_PARAMS.has(p));
		const mcpParams = mcpTool.params.filter((p) => !IGNORED_PARAMS.has(p));
		if (JSON.stringify(cliParams) !== JSON.stringify(mcpParams)) {
			paramMismatches.push({ tool: cliTool.name, cli: cliParams, mcp: mcpParams });
		}
		if (cliTool.description !== mcpTool.description) {
			descriptionMismatches.push({
				tool: cliTool.name,
				cli: cliTool.description,
				mcp: mcpTool.description,
			});
		}
	}

	return { missingInMcp, extraInMcp, paramMismatches, descriptionMismatches };
}

function parseArgs(argv: string[]): {
	siblingPath: string;
	liveUrl?: string;
	headers: Record<string, string>;
} {
	const args = {
		siblingPath: "../elnora-mcp-server",
		liveUrl: undefined as string | undefined,
		headers: {} as Record<string, string>,
	};
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--sibling-path" && argv[i + 1]) {
			args.siblingPath = argv[i + 1];
			i++;
		} else if (argv[i] === "--live" && argv[i + 1]) {
			args.liveUrl = argv[i + 1];
			i++;
		} else if (argv[i] === "--header" && argv[i + 1]) {
			const [k, ...rest] = argv[i + 1].split(":");
			args.headers[k.trim()] = rest.join(":").trim();
			i++;
		}
	}
	return args;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const cli = buildCliToolList();
	let mcp: ToolInfo[];
	if (args.liveUrl) {
		mcp = await fetchLiveMcpTools(args.liveUrl, args.headers);
	} else {
		const toolsDir = join(args.siblingPath, "src", "tools");
		mcp = parseMcpServerSibling(toolsDir);
	}

	const diff = diffToolSets(cli, mcp);
	const drift = diff.missingInMcp.length + diff.extraInMcp.length + diff.paramMismatches.length;

	console.log(`CLI tools: ${cli.length}`);
	console.log(`MCP tools: ${mcp.length}`);
	console.log(`Missing in MCP: ${diff.missingInMcp.length}`);
	for (const n of diff.missingInMcp) console.log(`  - ${n}`);
	console.log(`Extra in MCP (not in CLI): ${diff.extraInMcp.length}`);
	for (const n of diff.extraInMcp) console.log(`  - ${n}`);
	console.log(`Param mismatches: ${diff.paramMismatches.length}`);
	for (const m of diff.paramMismatches) {
		console.log(`  - ${m.tool}`);
		console.log(`      CLI: ${JSON.stringify(m.cli)}`);
		console.log(`      MCP: ${JSON.stringify(m.mcp)}`);
	}
	console.log(`Description mismatches: ${diff.descriptionMismatches.length}`);
	for (const m of diff.descriptionMismatches) {
		console.log(`  - ${m.tool}`);
	}

	process.exit(drift > 0 ? 1 : 0);
}

const entryPoint = process.argv[1] ? new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href : "";
if (import.meta.url === entryPoint) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
