import { describe, expect, test, vi } from "vitest";
import { libraryCreateFolder } from "../../../src/commands/library/create-folder.js";
import { libraryDeleteFolder } from "../../../src/commands/library/delete-folder.js";
import { libraryFiles } from "../../../src/commands/library/files.js";
import { libraryFolders } from "../../../src/commands/library/folders.js";
import { registerLibraryCommands } from "../../../src/commands/library/index.js";
import { libraryRenameFolder } from "../../../src/commands/library/rename-folder.js";
import type { CommandContext } from "../../../src/core/command.js";

const ORG_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const FOLDER_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";

function mockContext(overrides?: {
	getResult?: unknown;
	postResult?: unknown;
	putResult?: unknown;
	delResult?: unknown;
}): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? {}),
			post: vi.fn().mockResolvedValue(overrides?.postResult ?? {}),
			put: vi.fn().mockResolvedValue(overrides?.putResult ?? {}),
			del: vi.fn().mockResolvedValue(overrides?.delResult ?? undefined),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

// ---------------------------------------------------------------------------
// library.files
// ---------------------------------------------------------------------------

describe("library.files", () => {
	test("has correct name and group", () => {
		expect(libraryFiles.name).toBe("library.files");
		expect(libraryFiles.group).toBe("library");
	});

	test("has readOnlyHint annotation", () => {
		expect(libraryFiles.annotations?.readOnlyHint).toBe(true);
	});

	test("requires valid UUID org", () => {
		expect(() => libraryFiles.inputSchema.parse({})).toThrow();
		expect(() => libraryFiles.inputSchema.parse({ orgId: "not-uuid" })).toThrow();
	});

	test("uses default pagination values", () => {
		const parsed = libraryFiles.inputSchema.parse({ orgId: ORG_ID });
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
	});

	test("calls GET library_files with pagination", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await libraryFiles.execute({ orgId: ORG_ID, page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("library_files", {
			pathParams: { orgId: ORG_ID },
			queryParams: { page: 1, pageSize: 25 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});

	test("formatOutput compact returns id or JSON", () => {
		expect(libraryFiles.formatOutput({ id: "abc" }, "compact")).toBe("abc");
		expect(libraryFiles.formatOutput([1, 2], "compact")).toBe("[1,2]");
	});

	test("formatOutput json returns pretty JSON", () => {
		const output = { items: [] };
		expect(libraryFiles.formatOutput(output, "json")).toBe(JSON.stringify(output, null, 2));
	});
});

// ---------------------------------------------------------------------------
// library.folders
// ---------------------------------------------------------------------------

describe("library.folders", () => {
	test("has correct name and group", () => {
		expect(libraryFolders.name).toBe("library.folders");
		expect(libraryFolders.group).toBe("library");
	});

	test("has readOnlyHint annotation", () => {
		expect(libraryFolders.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET library_folders", async () => {
		const ctx = mockContext({ getResult: [] });
		await libraryFolders.execute({ orgId: ORG_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("library_folders", {
			pathParams: { orgId: ORG_ID },
		});
	});
});

// ---------------------------------------------------------------------------
// library.createFolder
// ---------------------------------------------------------------------------

describe("library.createFolder", () => {
	test("has correct name and group", () => {
		expect(libraryCreateFolder.name).toBe("library.createFolder");
		expect(libraryCreateFolder.group).toBe("library");
	});

	test("requires name", () => {
		expect(() => libraryCreateFolder.inputSchema.parse({ orgId: ORG_ID })).toThrow();
	});

	test("calls POST library_folders", async () => {
		const ctx = mockContext({ postResult: { id: FOLDER_ID } });
		await libraryCreateFolder.execute({ orgId: ORG_ID, name: "Research" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"library_folders",
			{ name: "Research" },
			{
				pathParams: { orgId: ORG_ID },
			},
		);
	});

	test("includes parentId when parent is provided", async () => {
		const ctx = mockContext({ postResult: { id: FOLDER_ID } });
		await libraryCreateFolder.execute({ orgId: ORG_ID, name: "Sub", parent: FOLDER_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"library_folders",
			{ name: "Sub", parentId: FOLDER_ID },
			{ pathParams: { orgId: ORG_ID } },
		);
	});
});

// ---------------------------------------------------------------------------
// library.renameFolder
// ---------------------------------------------------------------------------

describe("library.renameFolder", () => {
	test("has correct name and group", () => {
		expect(libraryRenameFolder.name).toBe("library.renameFolder");
		expect(libraryRenameFolder.group).toBe("library");
	});

	test("calls PUT library_folder", async () => {
		const ctx = mockContext({ putResult: {} });
		await libraryRenameFolder.execute({ orgId: ORG_ID, folderId: FOLDER_ID, name: "Renamed" }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"library_folder",
			{ name: "Renamed" },
			{
				pathParams: { orgId: ORG_ID, id: FOLDER_ID },
			},
		);
	});
});

// ---------------------------------------------------------------------------
// library.deleteFolder
// ---------------------------------------------------------------------------

describe("library.deleteFolder", () => {
	test("has correct name and group", () => {
		expect(libraryDeleteFolder.name).toBe("library.deleteFolder");
		expect(libraryDeleteFolder.group).toBe("library");
	});

	test("has destructiveHint annotation", () => {
		expect(libraryDeleteFolder.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE library_folder", async () => {
		const ctx = mockContext();
		const result = await libraryDeleteFolder.execute({ orgId: ORG_ID, folderId: FOLDER_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("library_folder", {
			pathParams: { orgId: ORG_ID, id: FOLDER_ID },
		});
		expect(result).toEqual({ deleted: true, folderId: FOLDER_ID });
	});

	test("formatOutput compact returns folderId", () => {
		expect(libraryDeleteFolder.formatOutput({ deleted: true, folderId: FOLDER_ID }, "compact")).toBe(FOLDER_ID);
	});
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("registerLibraryCommands", () => {
	test("returns 5 commands", () => {
		expect(registerLibraryCommands()).toHaveLength(5);
	});
});
