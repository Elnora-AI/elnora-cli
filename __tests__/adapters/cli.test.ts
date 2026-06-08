import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { buildProgram, zodToCommanderOptions } from "../../src/adapters/cli.js";
import type { ElnoraCommand } from "../../src/core/command.js";
import type { CommandRegistry } from "../../src/core/registry.js";

// The adapter builds a client via ElnoraApiClient.fromEnv for non-auth commands;
// stub it so these tests don't need a real profile/network.
vi.mock("../../src/lib/client.js", () => {
	const Client = vi.fn();
	(Client as unknown as { fromEnv: () => unknown }).fromEnv = vi.fn(() => ({}));
	return { ElnoraApiClient: Client };
});

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

// ---------------------------------------------------------------------------
// buildProgram — output format resolution (TTY-aware default, --json/--md/etc.)
// ---------------------------------------------------------------------------

const demoCmd: ElnoraCommand = {
	name: "demo.list",
	group: "demo",
	description: "List demo records",
	inputSchema: z.object({}),
	outputSchema: z.any(),
	async execute() {
		return { items: [{ id: "1", name: "Alpha" }], totalCount: 1 };
	},
	formatOutput(output: unknown) {
		return JSON.stringify(output, null, 2);
	},
};

function makeRegistry(cmd: ElnoraCommand): CommandRegistry {
	return {
		groups: () => [cmd.group],
		byGroup: () => [cmd],
		all: () => [cmd],
	} as unknown as CommandRegistry;
}

function spyStreams() {
	const out: string[] = [];
	const err: string[] = [];
	const o = vi.spyOn(process.stdout, "write").mockImplementation((c: unknown) => {
		out.push(String(c));
		return true;
	});
	const e = vi.spyOn(process.stderr, "write").mockImplementation((c: unknown) => {
		err.push(String(c));
		return true;
	});
	return {
		out: () => out.join(""),
		err: () => err.join(""),
		restore: () => {
			o.mockRestore();
			e.mockRestore();
		},
	};
}

function setTTY(stdout: boolean, stderr = stdout) {
	Object.defineProperty(process.stdout, "isTTY", { value: stdout, configurable: true });
	Object.defineProperty(process.stderr, "isTTY", { value: stderr, configurable: true });
}

describe("buildProgram output formatting", () => {
	let origOutTTY: boolean | undefined;
	let origErrTTY: boolean | undefined;
	let origExit: number | string | undefined;

	beforeEach(() => {
		origOutTTY = process.stdout.isTTY;
		origErrTTY = process.stderr.isTTY;
		origExit = process.exitCode;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Object.defineProperty(process.stdout, "isTTY", { value: origOutTTY, configurable: true });
		Object.defineProperty(process.stderr, "isTTY", { value: origErrTTY, configurable: true });
		process.exitCode = origExit;
	});

	async function run(args: string[]) {
		const program = buildProgram(makeRegistry(demoCmd));
		await program.parseAsync(["node", "elnora", ...args]);
	}

	test("non-TTY default → JSON (pipes and agents unaffected)", async () => {
		setTTY(false);
		const cap = spyStreams();
		await run(["demo", "list"]);
		const out = cap.out();
		cap.restore();
		expect(JSON.parse(out).items[0].name).toBe("Alpha");
	});

	test("TTY default → human table, not JSON", async () => {
		setTTY(true);
		const cap = spyStreams();
		await run(["demo", "list"]);
		const out = cap.out();
		cap.restore();
		expect(out).toContain("id");
		expect(out).toContain("Alpha");
		expect(() => JSON.parse(out.trim())).toThrow();
	});

	test("--json forces JSON even on a TTY", async () => {
		setTTY(true);
		const cap = spyStreams();
		await run(["--json", "demo", "list"]);
		const out = cap.out();
		cap.restore();
		expect(JSON.parse(out).totalCount).toBe(1);
	});

	test("--compact → single-line JSON", async () => {
		setTTY(true);
		const cap = spyStreams();
		await run(["--compact", "demo", "list"]);
		const out = cap.out().trim();
		cap.restore();
		expect(out).not.toContain("\n");
		expect(JSON.parse(out).totalCount).toBe(1);
	});

	test("--md → markdown table even when piped", async () => {
		setTTY(false);
		const cap = spyStreams();
		await run(["--md", "demo", "list"]);
		const out = cap.out();
		cap.restore();
		expect(out).toContain("| id | name |");
	});

	test("--output markdown → markdown table", async () => {
		setTTY(false);
		const cap = spyStreams();
		await run(["--output", "markdown", "demo", "list"]);
		const out = cap.out();
		cap.restore();
		expect(out).toContain("| id | name |");
	});

	test("unknown --output value → ValidationError, exit 2", async () => {
		setTTY(false);
		const cap = spyStreams();
		await run(["--output", "yaml", "demo", "list"]);
		const err = cap.err();
		cap.restore();
		expect(JSON.parse(err).code).toBe("VALIDATION_ERROR");
		expect(process.exitCode).toBe(2);
	});

	test("--output csv routes through the generic renderer", async () => {
		setTTY(true);
		const cap = spyStreams();
		await run(["--output", "csv", "demo", "list"]);
		const out = cap.out();
		cap.restore();
		expect(out).toContain("id,name");
		expect(out).toContain("1,Alpha");
	});

	test("--fields filters columns through the adapter", async () => {
		setTTY(false);
		const cap = spyStreams();
		await run(["--fields", "id", "demo", "list"]);
		const out = cap.out();
		cap.restore();
		const parsed = JSON.parse(out);
		expect(parsed.items[0]).toHaveProperty("id");
		expect(parsed.items[0]).not.toHaveProperty("name");
	});
});
