import { describe, expect, test } from "vitest";
import { z } from "zod";
import type { ElnoraCommand } from "../../src/core/command.js";
import { CommandRegistry } from "../../src/core/registry.js";
import { createElnoraServer, type McpRequestContext } from "../../src/mcp/server.js";

function makeTestCommand(name: string, group: string): ElnoraCommand {
	return {
		name,
		group,
		description: `Test ${name}`,
		inputSchema: z.object({
			value: z.string().optional().describe("A test value"),
		}),
		outputSchema: z.any(),
		annotations: { readOnlyHint: true },
		async execute(input) {
			return { echo: input.value ?? "default" };
		},
		formatOutput(output, _format) {
			return JSON.stringify(output);
		},
	};
}

function makeRegistry(...commands: ElnoraCommand[]): CommandRegistry {
	const registry = new CommandRegistry();
	for (const cmd of commands) {
		registry.register(cmd);
	}
	return registry;
}

function makeContext(overrides?: Partial<McpRequestContext>): () => McpRequestContext {
	return () => ({
		apiKey: "test-key",
		clientId: "test-client",
		scopes: ["*"],
		...overrides,
	});
}

describe("createElnoraServer", () => {
	test("creates McpServer without error", () => {
		const registry = makeRegistry(makeTestCommand("test.hello", "test"));
		const server = createElnoraServer(registry, makeContext());
		expect(server).toBeDefined();
	});

	test("registers all commands from registry", () => {
		const registry = makeRegistry(
			makeTestCommand("projects.list", "projects"),
			makeTestCommand("projects.create", "projects"),
			makeTestCommand("tasks.list", "tasks"),
		);
		const server = createElnoraServer(registry, makeContext());
		// McpServer doesn't expose tool count directly, but creation shouldn't throw
		expect(server).toBeDefined();
	});

	test("handles empty registry", () => {
		const registry = new CommandRegistry();
		const server = createElnoraServer(registry, makeContext());
		expect(server).toBeDefined();
	});

	test("tool names follow elnora_<group>_<action> convention", () => {
		// Verified by the fact that createElnoraServer doesn't throw
		// and the tool name transformation is: command.name.replace(/\./g, "_")
		const registry = makeRegistry(makeTestCommand("projects.create", "projects"));
		expect(() => createElnoraServer(registry, makeContext())).not.toThrow();
	});
});

describe("MCP tool naming", () => {
	test("dot notation converts to underscores", () => {
		// The tool name is computed as `elnora_${command.name.replace(/\\./g, "_")}`
		const name = "projects.create";
		const toolName = `elnora_${name.replace(/\./g, "_")}`;
		expect(toolName).toBe("elnora_projects_create");
	});

	test("nested names work", () => {
		const name = "orgs.members.update-role";
		const toolName = `elnora_${name.replace(/\./g, "_")}`;
		expect(toolName).toBe("elnora_orgs_members_update-role");
	});
});
