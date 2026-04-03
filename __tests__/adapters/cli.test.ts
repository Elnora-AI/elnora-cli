import { describe, expect, test } from "vitest";
import { z } from "zod";
import { zodToCommanderOptions } from "../../src/adapters/cli.js";

describe("zodToCommanderOptions", () => {
	test("converts required string to --flag <value>", () => {
		const schema = z.object({
			name: z.string().describe("Project name"),
		});
		const options = zodToCommanderOptions(schema);
		expect(options).toHaveLength(1);
		expect(options[0].flags).toBe("--name <value>");
		expect(options[0].description).toBe("Project name");
		expect(options[0].required).toBe(true);
		expect(options[0].isArgument).toBeUndefined();
	});

	test("converts optional string to --flag [value]", () => {
		const schema = z.object({
			description: z.string().optional().describe("Project description"),
		});
		const options = zodToCommanderOptions(schema);
		expect(options[0].flags).toBe("--description [value]");
		expect(options[0].required).toBe(false);
	});

	test("converts number with default", () => {
		const schema = z.object({
			page: z.number().int().default(1).describe("Page number"),
		});
		const options = zodToCommanderOptions(schema);
		expect(options[0].defaultValue).toBe(1);
		expect(options[0].required).toBe(false);
	});

	test("converts boolean to --flag (no value)", () => {
		const schema = z.object({
			compact: z.boolean().default(false).describe("Compact output"),
		});
		const options = zodToCommanderOptions(schema);
		expect(options[0].flags).toBe("--compact");
		expect(options[0].defaultValue).toBe(false);
	});

	test("converts enum to flag with choices", () => {
		const schema = z.object({
			role: z.enum(["Admin", "Member", "Viewer"]).describe("Member role"),
		});
		const options = zodToCommanderOptions(schema);
		expect(options[0].choices).toEqual(["Admin", "Member", "Viewer"]);
	});

	test("converts camelCase to kebab-case", () => {
		const schema = z.object({
			pageSize: z.number().default(25).describe("Results per page"),
		});
		const options = zodToCommanderOptions(schema);
		expect(options[0].flags).toBe("--page-size [value]");
	});

	test("converts required UUID field ending in Id to positional argument", () => {
		const schema = z.object({
			projectId: z.string().uuid().describe("Project ID"),
			name: z.string().optional().describe("New name"),
		});
		const options = zodToCommanderOptions(schema);
		const arg = options.find((o) => o.isArgument);
		const flag = options.find((o) => !o.isArgument);
		expect(arg).toBeDefined();
		expect(arg?.flags).toBe("<project-id>");
		expect(arg?.isArgument).toBe(true);
		expect(flag).toBeDefined();
		expect(flag?.flags).toBe("--name [value]");
	});

	test("handles empty schema", () => {
		const schema = z.object({});
		expect(zodToCommanderOptions(schema)).toEqual([]);
	});

	test("handles multiple fields in order", () => {
		const schema = z.object({
			projectId: z.string().uuid().describe("Project ID"),
			name: z.string().describe("Name"),
			description: z.string().optional().describe("Description"),
			page: z.number().default(1).describe("Page"),
		});
		const options = zodToCommanderOptions(schema);
		expect(options).toHaveLength(4);
		expect(options[0].isArgument).toBe(true); // projectId → argument
		expect(options[1].flags).toContain("--name");
		expect(options[2].flags).toContain("--description");
		expect(options[3].flags).toContain("--page");
	});
});
