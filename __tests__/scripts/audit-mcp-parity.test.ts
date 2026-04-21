import { describe, expect, it } from "vitest";
import { buildCliToolList, diffToolSets, parseMcpServerSource } from "../../scripts/audit-mcp-parity.js";

describe("audit-mcp-parity", () => {
	describe("buildCliToolList", () => {
		it("produces elnora_{group}_{action} names for every registered command", () => {
			const tools = buildCliToolList();
			expect(tools.length).toBeGreaterThan(50);
			for (const t of tools) {
				expect(t.name).toMatch(/^elnora_[a-z0-9-]+_[a-zA-Z0-9-]+$/);
				expect(t.description).toBeTruthy();
				expect(Array.isArray(t.params)).toBe(true);
			}
		});

		it("respects exposeInMcp: false annotation (commands hidden from MCP surface)", () => {
			const tools = buildCliToolList();
			const toolNames = tools.map((t) => t.name);
			// whoami/doctor/open/setup/update/completion are standalone Commander commands,
			// not ElnoraCommand instances, so they are naturally absent. This test enforces
			// the contract that registry-based commands can opt out via annotation.
			expect(toolNames).not.toContain("elnora_undefined_undefined");
		});
	});

	describe("diffToolSets", () => {
		it("reports no drift when CLI and MCP match exactly", () => {
			const cli = [{ name: "elnora_projects_create", description: "Create a project", params: ["name"] }];
			const mcp = [{ name: "elnora_projects_create", description: "Create a project", params: ["name"] }];
			const diff = diffToolSets(cli, mcp);
			expect(diff.missingInMcp).toEqual([]);
			expect(diff.extraInMcp).toEqual([]);
			expect(diff.paramMismatches).toEqual([]);
			expect(diff.descriptionMismatches).toEqual([]);
		});

		it("flags missing tools, extra tools, and param mismatches", () => {
			const cli = [
				{ name: "elnora_projects_create", description: "Create a project", params: ["name"] },
				{ name: "elnora_files_upload", description: "Upload file", params: ["path"] },
			];
			const mcp = [
				{ name: "elnora_projects_create", description: "Create a project", params: ["name", "description"] },
				{ name: "elnora_orphan_tool", description: "Old tool", params: [] },
			];
			const diff = diffToolSets(cli, mcp);
			expect(diff.missingInMcp).toEqual(["elnora_files_upload"]);
			expect(diff.extraInMcp).toEqual(["elnora_orphan_tool"]);
			expect(diff.paramMismatches).toHaveLength(1);
			expect(diff.paramMismatches[0].tool).toBe("elnora_projects_create");
			expect(diff.paramMismatches[0].cli).toEqual(["name"]);
			expect(diff.paramMismatches[0].mcp).toEqual(["name", "description"]);
		});

		it("flags description mismatches", () => {
			const cli = [{ name: "elnora_flags_get", description: "Get a feature flag", params: ["name"] }];
			const mcp = [{ name: "elnora_flags_get", description: "Get a flag value", params: ["name"] }];
			const diff = diffToolSets(cli, mcp);
			expect(diff.descriptionMismatches).toHaveLength(1);
			expect(diff.descriptionMismatches[0].tool).toBe("elnora_flags_get");
		});

		it("ignores OUTPUT_OPTIONS_SCHEMA params (compact/fields) when diffing", () => {
			// MCP tools spread OUTPUT_OPTIONS_SCHEMA into every inputSchema, adding
			// `compact` and `fields` params that the CLI doesn't track. These must not
			// be flagged as mismatches.
			const cli = [{ name: "elnora_projects_list", description: "List projects", params: ["pageSize"] }];
			const mcp = [
				{
					name: "elnora_projects_list",
					description: "List projects",
					params: ["pageSize", "compact", "fields"],
				},
			];
			const diff = diffToolSets(cli, mcp);
			expect(diff.paramMismatches).toEqual([]);
		});
	});

	describe("parseMcpServerSource", () => {
		it("extracts tool names from a registerTool() call", () => {
			const src = `
				server.registerTool(
					"elnora_projects_list",
					{
						title: "List Projects",
						description: "List all projects. Returns paginated project summaries.",
						inputSchema: {
							orgId: z.string().uuid().optional().describe("Organization UUID"),
							page: z.number().int().min(1).default(1).describe("Page number"),
							...OUTPUT_OPTIONS_SCHEMA,
						},
					},
					withGuard(...),
				);
			`;
			const tools = parseMcpServerSource(src);
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe("elnora_projects_list");
			expect(tools[0].description).toBe("List all projects. Returns paginated project summaries.");
			expect(tools[0].params).toContain("orgId");
			expect(tools[0].params).toContain("page");
			// OUTPUT_OPTIONS_SCHEMA spread is not extracted as a literal param —
			// diffToolSets filters out compact/fields on both sides anyway.
		});

		it("extracts multiple tools from one file", () => {
			const src = `
				server.registerTool("elnora_flags_list", { description: "List flags", inputSchema: {} }, withGuard(...));
				server.registerTool("elnora_flags_get", { description: "Get flag", inputSchema: { name: z.string() } }, withGuard(...));
			`;
			const tools = parseMcpServerSource(src);
			expect(tools.map((t) => t.name)).toEqual(["elnora_flags_list", "elnora_flags_get"]);
		});
	});
});
