/**
 * CLI reference generator for docs.elnora.ai.
 *
 * Introspects the single source of truth — the CommandRegistry — and emits one
 * MDX page per command group (plus an index + meta.json) for the Fumadocs site.
 * Because it reads the same registry the real CLI/MCP adapters consume, the docs
 * cannot drift from the shipped command surface.
 *
 * Usage:
 *   tsx scripts/gen-docs-reference.ts --out ../elnora-docs/content/docs/cli
 *
 * Default --out is ../elnora-docs/content/docs/cli (sibling repo layout).
 */

import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { buildRegistry } from "../src/core/build-registry.js";
import type { ElnoraCommand } from "../src/core/command.js";

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
let outArg = "../elnora-docs/content/docs/cli";
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === "--out" && argv[i + 1]) {
		outArg = argv[i + 1];
		i++;
	}
}
const outDir = resolve(process.cwd(), outArg);

// ---------------------------------------------------------------------------
// escaping helpers (MDX + markdown-table safe)
// ---------------------------------------------------------------------------
function inlineText(s: string | undefined): string {
	// Safe for prose / table cells: neutralise MDX-significant chars and pipes.
	// Escape & first so existing entities aren't double-encoded; encode the pipe
	// as an HTML entity (no backslash escaping) so table cells stay valid.
	return (s ?? "")
		.replace(/\r?\n+/g, " ")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/\{/g, "&#123;")
		.replace(/\}/g, "&#125;")
		.replace(/\|/g, "&#124;")
		.trim();
}

function frontmatterValue(s: string): string {
	// double-quoted YAML scalar
	return `"${(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n+/g, " ").trim()}"`;
}

// ---------------------------------------------------------------------------
// JSON-schema → readable parameter rows
// ---------------------------------------------------------------------------
interface ParamRow {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

type JsonSchemaNode = {
	type?: string;
	format?: string;
	description?: string;
	enum?: unknown[];
	default?: unknown;
	items?: JsonSchemaNode;
	anyOf?: JsonSchemaNode[];
	oneOf?: JsonSchemaNode[];
	const?: unknown;
	properties?: Record<string, JsonSchemaNode>;
	required?: string[];
};

function renderType(node: JsonSchemaNode | undefined): string {
	if (!node) return "any";
	const union = node.anyOf ?? node.oneOf;
	if (Array.isArray(union)) {
		const nonNull = union.filter((p) => p?.type !== "null");
		const rendered = Array.from(new Set(nonNull.map(renderType)));
		return rendered.join(" \\| ") || "any";
	}
	if (Array.isArray(node.enum)) return "enum";
	if (node.type === "array") return `${renderType(node.items)}[]`;
	if (node.format) return node.format; // e.g. uuid, email, date-time
	if (node.type) return node.type;
	if (node.const !== undefined) return typeof node.const;
	return "any";
}

function enumValues(node: JsonSchemaNode | undefined): unknown[] | null {
	if (!node) return null;
	if (Array.isArray(node.enum)) return node.enum;
	const union = node.anyOf ?? node.oneOf;
	if (Array.isArray(union)) {
		const withEnum = union.find((p) => Array.isArray(p.enum));
		if (withEnum?.enum) return withEnum.enum;
	}
	return null;
}

function paramRows(cmd: ElnoraCommand): ParamRow[] {
	let schema: JsonSchemaNode;
	try {
		schema = z.toJSONSchema(cmd.inputSchema as z.ZodType) as JsonSchemaNode;
	} catch {
		return [];
	}
	const props = schema.properties ?? {};
	const required = new Set(schema.required ?? []);
	return Object.entries(props)
		.filter(([name]) => name !== "compact" && name !== "fields")
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, node]) => {
			const parts: string[] = [];
			if (node.description) parts.push(node.description);
			const evs = enumValues(node);
			if (evs) parts.push(`One of: ${evs.map((v) => `\`${String(v)}\``).join(", ")}.`);
			if (node.default !== undefined) parts.push(`Default: \`${String(node.default)}\`.`);
			return {
				name,
				type: renderType(node),
				// A param with a default is optional for the user even if the schema marks it required.
				required: required.has(name) && node.default === undefined,
				description: parts.join(" "),
			};
		});
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------
function badges(cmd: ElnoraCommand): string {
	const a = cmd.annotations;
	if (!a) return "";
	const tags: string[] = [];
	if (a.readOnlyHint) tags.push("Read-only");
	if (a.destructiveHint) tags.push("Destructive");
	if (a.idempotentHint) tags.push("Idempotent");
	if (a.exposeInMcp === false) tags.push("CLI-only");
	return tags.length ? `*${tags.join(" · ")}*\n\n` : "";
}

function renderCommand(cmd: ElnoraCommand): string {
	const invocation = `elnora ${cmd.name.replace(/\./g, " ")}`;
	const rows = paramRows(cmd);

	let out = `## ${invocation}\n\n`;
	if (cmd.description) out += `${inlineText(cmd.description)}\n\n`;
	out += badges(cmd);
	out += "```bash\n";
	out += `${invocation}${rows.some((r) => r.required) ? " [required options]" : ""}${
		rows.length ? " [options]" : ""
	}\n`;
	out += "```\n\n";

	if (rows.length) {
		out += "| Parameter | Type | Required | Description |\n";
		out += "| --- | --- | --- | --- |\n";
		for (const r of rows) {
			out += `| \`${r.name}\` | ${r.type} | ${r.required ? "yes" : "no"} | ${inlineText(
				r.description,
			)} |\n`;
		}
		out += "\n";
	}
	return out;
}

const GROUP_BLURB: Record<string, string> = {
	account: "Manage your account profile and legal agreements.",
	"api-keys": "Create, list, and revoke API keys for programmatic access.",
	audit: "Read your organization's audit log.",
	auth: "Authenticate the CLI and manage profiles (CLI-only).",
	feedback: "Submit product feedback.",
	files: "Upload, manage, and organize workspace files.",
	flags: "Read feature flags.",
	folders: "Create and manage folders.",
	health: "Check platform and service health.",
	library: "Manage your organization's shared library.",
	orgs: "Manage organizations, members, and invitations.",
	projects: "Create and manage projects and their members.",
	protocols: "Generate and optimize bioprotocols.",
	review: "Approve or reject Knowledge Base auto-tidy proposals.",
	search: "Search across your knowledge base and content.",
	tasks: "Drive the Elnora agent — create tasks and exchange messages.",
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------
const registry = buildRegistry();
// Public developer surface only. Commands flagged `annotations.internal` are
// staff/SystemAdmin-only and MUST NOT appear on the public portal (docs.elnora.ai).
const isPublic = (c: ElnoraCommand) => !c.annotations?.internal;
const allGroups = registry.groups();
const allCommands = registry.all().filter(isPublic);
const renderedGroups: string[] = [];

mkdirSync(outDir, { recursive: true });
// Clean previously-generated group pages so removed commands don't linger.
for (const f of readdirSync(outDir)) {
	if (f.endsWith(".mdx") || f === "meta.json") rmSync(join(outDir, f));
}

const groupTitle = (g: string) => g.replace(/(^|-)([a-z])/g, (_, p, c) => (p ? " " : "") + c.toUpperCase());

for (const group of allGroups) {
	const cmds = registry.byGroup(group).filter(isPublic).sort((a, b) => a.name.localeCompare(b.name));
	if (cmds.length === 0) continue; // group is entirely internal — no public page
	renderedGroups.push(group);
	const blurb = GROUP_BLURB[group] ?? `${cmds.length} \`${group}\` commands.`;
	let body = `---\ntitle: ${frontmatterValue(groupTitle(group))}\ndescription: ${frontmatterValue(
		blurb,
	)}\n---\n\n`;
	body += `${blurb}\n\n`;
	for (const cmd of cmds) body += renderCommand(cmd);
	writeFileSync(join(outDir, `${group}.mdx`), body, "utf-8");
}

// index page
const indexBody = `---
title: "CLI reference"
description: "Install the elnora CLI, authenticate, and explore every command — generated from the CLI's own command registry."
---

The \`elnora\` CLI gives you scriptable access to the Elnora platform. It ships
**${allCommands.length} commands** across **${renderedGroups.length} groups** (plus standalone
utilities below). Every page here is generated directly from the CLI's command
registry, so it always matches the installed version.

## Install

\`\`\`bash
npm install -g @elnora-ai/cli
# or: brew install elnora-ai/tap/elnora
\`\`\`

## Authenticate

\`\`\`bash
elnora auth login
\`\`\`

## Global flags

These apply to every command:

| Flag | Description |
| --- | --- |
| \`--output <format>\` | Output format (e.g. \`json\`, \`table\`). |
| \`--json\` | Shorthand for \`--output json\`. |
| \`--compact\` | Compact output. |
| \`--fields <list>\` | Limit output to specific fields. |
| \`--profile <name>\` | Use a named auth profile. |

## Utility commands

| Command | Description |
| --- | --- |
| \`elnora setup\` | Interactive first-time setup. |
| \`elnora doctor\` | Diagnose your environment and auth. |
| \`elnora whoami\` | Show the current authenticated identity. |
| \`elnora open\` | Open Elnora resources in the browser. |
| \`elnora mcp\` | Run the local MCP server. |
| \`elnora update\` | Update the CLI to the latest version. |
| \`elnora completion\` | Generate shell completions. |

## Command groups

${renderedGroups
	.map((g) => `- [\`${g}\`](/docs/cli/${g}) — ${GROUP_BLURB[g] ?? `${registry.byGroup(g).filter(isPublic).length} commands`}`)
	.join("\n")}

> Most of these operations are also available over the hosted MCP server. See **MCP & integrations** for the tool catalog and connection steps.
`;
writeFileSync(join(outDir, "index.mdx"), indexBody, "utf-8");

// meta.json controls sidebar order
const meta = {
	title: "CLI",
	pages: ["index", ...renderedGroups],
};
writeFileSync(join(outDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf-8");

console.log(
	`Generated CLI reference: ${allCommands.length} public commands / ${renderedGroups.length} groups -> ${outDir}`,
);
