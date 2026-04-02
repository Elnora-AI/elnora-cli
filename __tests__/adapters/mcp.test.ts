import { describe, expect, test } from "vitest";
import { z } from "zod";
import { commandToMcpTool, registryToMcpTools } from "../../src/adapters/mcp.js";
import { CommandRegistry } from "../../src/core/registry.js";
import type { ElnoraCommand } from "../../src/core/command.js";

const testCommand: ElnoraCommand = {
	name: "projects.create",
	group: "projects",
	description: "Create a new project",
	inputSchema: z.object({
		name: z.string().min(1).max(100).describe("Project name"),
		description: z.string().optional().describe("Project description"),
	}),
	outputSchema: z.object({ id: z.string(), name: z.string() }),
	annotations: { destructiveHint: true },
	async execute(input) {
		return { id: "test", name: input.name };
	},
	formatOutput(output) {
		return JSON.stringify(output);
	},
};

describe("commandToMcpTool", () => {
	test("generates correct tool name (dot → underscore)", () => {
		const tool = commandToMcpTool(testCommand);
		expect(tool.name).toBe("elnora_projects_create");
	});

	test("uses command description", () => {
		const tool = commandToMcpTool(testCommand);
		expect(tool.description).toBe("Create a new project");
	});

	test("generates JSON Schema from Zod", () => {
		const tool = commandToMcpTool(testCommand);
		expect(tool.inputSchema.type).toBe("object");
		const props = tool.inputSchema.properties as Record<string, unknown>;
		expect(props.name).toBeDefined();
		expect(props.description).toBeDefined();
	});

	test("preserves annotations", () => {
		const tool = commandToMcpTool(testCommand);
		expect(tool.annotations?.destructiveHint).toBe(true);
	});

	test("strips $schema from JSON Schema", () => {
		const tool = commandToMcpTool(testCommand);
		expect(tool.inputSchema.$schema).toBeUndefined();
	});

	test("handles nested dot names", () => {
		const cmd: ElnoraCommand = {
			...testCommand,
			name: "orgs.members.update-role",
		};
		const tool = commandToMcpTool(cmd);
		expect(tool.name).toBe("elnora_orgs_members_update-role");
	});
});

describe("registryToMcpTools", () => {
	test("converts all registry commands", () => {
		const registry = new CommandRegistry();
		registry.register(testCommand);
		registry.register({
			...testCommand,
			name: "projects.list",
			description: "List projects",
			annotations: { readOnlyHint: true },
		});

		const tools = registryToMcpTools(registry);
		expect(tools).toHaveLength(2);
		expect(tools.map((t) => t.name).sort()).toEqual(["elnora_projects_create", "elnora_projects_list"]);
	});

	test("empty registry produces empty array", () => {
		const registry = new CommandRegistry();
		expect(registryToMcpTools(registry)).toEqual([]);
	});
});
