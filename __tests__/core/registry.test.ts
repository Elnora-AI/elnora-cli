import { describe, expect, test } from "vitest";
import { z } from "zod";
import { CommandRegistry } from "../../src/core/registry.js";
import type { ElnoraCommand } from "../../src/core/command.js";

function makeCommand(name: string, group: string): ElnoraCommand {
	return {
		name,
		group,
		description: `Test command ${name}`,
		inputSchema: z.object({}),
		outputSchema: z.object({}),
		annotations: { readOnlyHint: true },
		async execute() {
			return {};
		},
		formatOutput(output, format) {
			return JSON.stringify(output);
		},
	};
}

describe("CommandRegistry", () => {
	test("registers and retrieves commands", () => {
		const registry = new CommandRegistry();
		const cmd = makeCommand("projects.list", "projects");
		registry.register(cmd);
		expect(registry.get("projects.list")).toBe(cmd);
	});

	test("returns undefined for unknown commands", () => {
		const registry = new CommandRegistry();
		expect(registry.get("nonexistent")).toBeUndefined();
	});

	test("lists all commands", () => {
		const registry = new CommandRegistry();
		registry.register(makeCommand("projects.list", "projects"));
		registry.register(makeCommand("tasks.list", "tasks"));
		expect(registry.all()).toHaveLength(2);
	});

	test("lists commands by group", () => {
		const registry = new CommandRegistry();
		registry.register(makeCommand("projects.list", "projects"));
		registry.register(makeCommand("projects.create", "projects"));
		registry.register(makeCommand("tasks.list", "tasks"));
		expect(registry.byGroup("projects")).toHaveLength(2);
		expect(registry.byGroup("tasks")).toHaveLength(1);
		expect(registry.byGroup("files")).toHaveLength(0);
	});

	test("throws on duplicate registration", () => {
		const registry = new CommandRegistry();
		registry.register(makeCommand("projects.list", "projects"));
		expect(() => registry.register(makeCommand("projects.list", "projects"))).toThrow(
			"Duplicate command: projects.list",
		);
	});

	test("groups returns sorted group names", () => {
		const registry = new CommandRegistry();
		registry.register(makeCommand("tasks.list", "tasks"));
		registry.register(makeCommand("auth.login", "auth"));
		registry.register(makeCommand("projects.list", "projects"));
		expect(registry.groups()).toEqual(["auth", "projects", "tasks"]);
	});

	test("empty registry", () => {
		const registry = new CommandRegistry();
		expect(registry.all()).toEqual([]);
		expect(registry.groups()).toEqual([]);
		expect(registry.byGroup("projects")).toEqual([]);
	});
});
