import { describe, expect, test, vi } from "vitest";
import { searchAll } from "../../../src/commands/search/all.js";
import { searchFileContent } from "../../../src/commands/search/file-content.js";
import { searchFiles } from "../../../src/commands/search/files.js";
import { registerSearchCommands } from "../../../src/commands/search/index.js";
import { searchTasks } from "../../../src/commands/search/tasks.js";
import type { CommandContext } from "../../../src/core/command.js";

const PROJECT_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

function mockContext(overrides?: { getResult?: unknown }): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? {}),
			post: vi.fn().mockResolvedValue({}),
			patch: vi.fn().mockResolvedValue({}),
			put: vi.fn().mockResolvedValue({}),
			del: vi.fn().mockResolvedValue(undefined),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

// ---------------------------------------------------------------------------
// search.tasks
// ---------------------------------------------------------------------------

describe("search.tasks", () => {
	test("has correct name and group", () => {
		expect(searchTasks.name).toBe("search.tasks");
		expect(searchTasks.group).toBe("search");
	});

	test("has readOnlyHint annotation", () => {
		expect(searchTasks.annotations?.readOnlyHint).toBe(true);
	});

	test("requires query string", () => {
		expect(() => searchTasks.inputSchema.parse({})).toThrow();
		expect(() => searchTasks.inputSchema.parse({ query: "" })).toThrow();
	});

	test("uses default pagination values", () => {
		const parsed = searchTasks.inputSchema.parse({ query: "test" });
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
	});

	test("calls GET /search/tasks with query params", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await searchTasks.execute({ query: "my task", page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("search_tasks", {
			queryParams: { q: "my task", page: 1, pageSize: 25 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});
});

// ---------------------------------------------------------------------------
// search.files
// ---------------------------------------------------------------------------

describe("search.files", () => {
	test("has correct name and group", () => {
		expect(searchFiles.name).toBe("search.files");
		expect(searchFiles.group).toBe("search");
	});

	test("has readOnlyHint annotation", () => {
		expect(searchFiles.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /search/files with query params", async () => {
		const ctx = mockContext({ getResult: { items: [] } });
		const result = await searchFiles.execute({ query: "report", page: 2, pageSize: 10 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("search_files", {
			queryParams: { q: "report", page: 2, pageSize: 10 },
		});
		expect(result).toEqual({ items: [] });
	});
});

// ---------------------------------------------------------------------------
// search.all
// ---------------------------------------------------------------------------

describe("search.all", () => {
	test("has correct name and group", () => {
		expect(searchAll.name).toBe("search.all");
		expect(searchAll.group).toBe("search");
	});

	test("has readOnlyHint annotation", () => {
		expect(searchAll.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /search with query params", async () => {
		const ctx = mockContext({ getResult: { tasks: [], files: [] } });
		const result = await searchAll.execute({ query: "experiment", page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("search_all", {
			queryParams: { q: "experiment", page: 1, pageSize: 25 },
		});
		expect(result).toEqual({ tasks: [], files: [] });
	});
});

// ---------------------------------------------------------------------------
// search.fileContent
// ---------------------------------------------------------------------------

describe("search.fileContent", () => {
	test("has correct name and group", () => {
		expect(searchFileContent.name).toBe("search.fileContent");
		expect(searchFileContent.group).toBe("search");
	});

	test("has readOnlyHint annotation", () => {
		expect(searchFileContent.annotations?.readOnlyHint).toBe(true);
	});

	test("project is optional", () => {
		const parsed = searchFileContent.inputSchema.parse({ query: "dna" });
		expect(parsed.projectId).toBeUndefined();
		expect(parsed.page).toBe(1);
	});

	test("calls GET /search/file-content without project", async () => {
		const ctx = mockContext({ getResult: { items: [] } });
		await searchFileContent.execute({ query: "pcr", page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("search_file_content", {
			queryParams: { q: "pcr", page: 1, pageSize: 25 },
		});
	});

	test("includes project filter when provided", async () => {
		const ctx = mockContext({ getResult: { items: [] } });
		await searchFileContent.execute({ query: "pcr", projectId: PROJECT_ID, page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("search_file_content", {
			queryParams: { q: "pcr", page: 1, pageSize: 25, project: PROJECT_ID },
		});
	});
});

// ---------------------------------------------------------------------------
// registerSearchCommands
// ---------------------------------------------------------------------------

describe("registerSearchCommands", () => {
	test("returns all 4 search commands", () => {
		const commands = registerSearchCommands();
		expect(commands).toHaveLength(4);
	});

	test("all commands belong to search group", () => {
		const commands = registerSearchCommands();
		for (const cmd of commands) {
			expect(cmd.group).toBe("search");
		}
	});

	test("all command names start with search.", () => {
		const commands = registerSearchCommands();
		for (const cmd of commands) {
			expect(cmd.name).toMatch(/^search\./);
		}
	});

	test("command names are unique", () => {
		const commands = registerSearchCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
