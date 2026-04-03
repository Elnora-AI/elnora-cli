import { describe, expect, test } from "vitest";
import { buildProgram, zodToCommanderOptions } from "../../src/adapters/cli.js";
import { commandToMcpTool, registryToMcpTools } from "../../src/adapters/mcp.js";
import { healthCheck } from "../../src/commands/health.js";
import { CommandRegistry } from "../../src/core/registry.js";

describe("Full pipeline integration — health.check", () => {
	test("MCP adapter produces valid tool definition", () => {
		const tool = commandToMcpTool(healthCheck);
		expect(tool.name).toBe("elnora_health_check");
		expect(tool.description).toBe("Check Elnora API health status");
		expect(tool.inputSchema).toBeDefined();
		expect(tool.annotations?.readOnlyHint).toBe(true);
	});

	test("CLI adapter produces valid Commander options (empty for health)", () => {
		const options = zodToCommanderOptions(healthCheck.inputSchema);
		expect(options).toEqual([]);
	});

	test("Registry + CLI program builds without error", () => {
		const registry = new CommandRegistry();
		registry.register(healthCheck);
		const program = buildProgram(registry);
		const healthCmd = program.commands.find((c) => c.name() === "health");
		expect(healthCmd).toBeDefined();
		const checkCmd = healthCmd?.commands.find((c) => c.name() === "check");
		expect(checkCmd).toBeDefined();
		expect(checkCmd?.description()).toBe("Check Elnora API health status");
	});

	test("Registry + MCP tools generates correct tool list", () => {
		const registry = new CommandRegistry();
		registry.register(healthCheck);
		const tools = registryToMcpTools(registry);
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe("elnora_health_check");
	});
});
