import { describe, expect, test, vi } from "vitest";
import type { CommandContext } from "../../../src/core/command.js";
import { ValidationError } from "../../../src/lib/errors.js";
import { foldersList } from "../../../src/commands/folders/list.js";
import { foldersCreate } from "../../../src/commands/folders/create.js";
import { foldersRename } from "../../../src/commands/folders/rename.js";
import { foldersMove } from "../../../src/commands/folders/move.js";
import { foldersDelete } from "../../../src/commands/folders/delete.js";
import { registerFolderCommands } from "../../../src/commands/folders/index.js";

const PROJECT_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const FOLDER_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";
const PARENT_ID = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";

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
			patch: vi.fn().mockResolvedValue({}),
			put: vi.fn().mockResolvedValue(overrides?.putResult ?? {}),
			del: vi.fn().mockResolvedValue(overrides?.delResult ?? undefined),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

// ---------------------------------------------------------------------------
// folders.list
// ---------------------------------------------------------------------------

describe("folders.list", () => {
	test("has correct name and group", () => {
		expect(foldersList.name).toBe("folders.list");
		expect(foldersList.group).toBe("folders");
	});

	test("has readOnlyHint annotation", () => {
		expect(foldersList.annotations?.readOnlyHint).toBe(true);
	});

	test("requires a valid UUID projectId", () => {
		expect(() => foldersList.inputSchema.parse({})).toThrow();
		expect(() => foldersList.inputSchema.parse({ projectId: "bad" })).toThrow();
	});

	test("calls GET /projects/{id}/folders", async () => {
		const ctx = mockContext({ getResult: [{ id: FOLDER_ID, name: "Data" }] });
		const result = await foldersList.execute({ projectId: PROJECT_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("project_folders", {
			pathParams: { id: PROJECT_ID },
		});
		expect(result).toEqual([{ id: FOLDER_ID, name: "Data" }]);
	});
});

// ---------------------------------------------------------------------------
// folders.create
// ---------------------------------------------------------------------------

describe("folders.create", () => {
	test("has correct name and group", () => {
		expect(foldersCreate.name).toBe("folders.create");
		expect(foldersCreate.group).toBe("folders");
	});

	test("requires projectId and name", () => {
		expect(() => foldersCreate.inputSchema.parse({})).toThrow();
		expect(() => foldersCreate.inputSchema.parse({ projectId: PROJECT_ID })).toThrow();
		expect(foldersCreate.inputSchema.parse({ projectId: PROJECT_ID, name: "Folder" })).toEqual({
			projectId: PROJECT_ID,
			name: "Folder",
		});
	});

	test("calls POST /projects/{id}/folders", async () => {
		const ctx = mockContext({ postResult: { id: FOLDER_ID, name: "New" } });
		const result = await foldersCreate.execute(
			{ projectId: PROJECT_ID, name: "New" },
			ctx,
		);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"project_folders",
			{ name: "New" },
			{ pathParams: { id: PROJECT_ID } },
		);
		expect(result).toEqual({ id: FOLDER_ID, name: "New" });
	});

	test("includes parentId when provided", async () => {
		const ctx = mockContext({ postResult: { id: FOLDER_ID } });
		await foldersCreate.execute(
			{ projectId: PROJECT_ID, name: "Sub", parentId: PARENT_ID },
			ctx,
		);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"project_folders",
			{ name: "Sub", parentId: PARENT_ID },
			{ pathParams: { id: PROJECT_ID } },
		);
	});
});

// ---------------------------------------------------------------------------
// folders.rename
// ---------------------------------------------------------------------------

describe("folders.rename", () => {
	test("has correct name and group", () => {
		expect(foldersRename.name).toBe("folders.rename");
		expect(foldersRename.group).toBe("folders");
	});

	test("has idempotentHint annotation", () => {
		expect(foldersRename.annotations?.idempotentHint).toBe(true);
	});

	test("calls PUT /folders/{id}", async () => {
		const ctx = mockContext({ putResult: { id: FOLDER_ID, name: "Renamed" } });
		const result = await foldersRename.execute(
			{ folderId: FOLDER_ID, name: "Renamed" },
			ctx,
		);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"folder",
			{ name: "Renamed" },
			{ pathParams: { id: FOLDER_ID } },
		);
		expect(result).toEqual({ id: FOLDER_ID, name: "Renamed" });
	});
});

// ---------------------------------------------------------------------------
// folders.move
// ---------------------------------------------------------------------------

describe("folders.move", () => {
	test("has correct name and group", () => {
		expect(foldersMove.name).toBe("folders.move");
		expect(foldersMove.group).toBe("folders");
	});

	test("sends null parentId when 'root' is provided", async () => {
		const ctx = mockContext({ putResult: { id: FOLDER_ID } });
		await foldersMove.execute({ folderId: FOLDER_ID, parentId: "root" }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"folder_move",
			{ parentId: null },
			{ pathParams: { id: FOLDER_ID } },
		);
	});

	test("sends UUID parentId when valid UUID is provided", async () => {
		const ctx = mockContext({ putResult: { id: FOLDER_ID } });
		await foldersMove.execute({ folderId: FOLDER_ID, parentId: PARENT_ID }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"folder_move",
			{ parentId: PARENT_ID },
			{ pathParams: { id: FOLDER_ID } },
		);
	});

	test("throws ValidationError for invalid parent value", async () => {
		const ctx = mockContext();
		await expect(
			foldersMove.execute({ folderId: FOLDER_ID, parentId: "invalid-string" }, ctx),
		).rejects.toThrow(ValidationError);
	});
});

// ---------------------------------------------------------------------------
// folders.delete
// ---------------------------------------------------------------------------

describe("folders.delete", () => {
	test("has correct name and group", () => {
		expect(foldersDelete.name).toBe("folders.delete");
		expect(foldersDelete.group).toBe("folders");
	});

	test("has destructiveHint annotation", () => {
		expect(foldersDelete.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /folders/{id} and returns deleted result", async () => {
		const ctx = mockContext();
		const result = await foldersDelete.execute({ folderId: FOLDER_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("folder", {
			pathParams: { id: FOLDER_ID },
		});
		expect(result).toEqual({ deleted: true, folderId: FOLDER_ID });
	});

	test("formatOutput compact returns folderId", () => {
		expect(foldersDelete.formatOutput({ deleted: true, folderId: FOLDER_ID }, "compact")).toBe(
			FOLDER_ID,
		);
	});
});

// ---------------------------------------------------------------------------
// registerFolderCommands
// ---------------------------------------------------------------------------

describe("registerFolderCommands", () => {
	test("returns all 5 folder commands", () => {
		const commands = registerFolderCommands();
		expect(commands).toHaveLength(5);
	});

	test("all commands belong to folders group", () => {
		const commands = registerFolderCommands();
		for (const cmd of commands) {
			expect(cmd.group).toBe("folders");
		}
	});

	test("all command names start with folders.", () => {
		const commands = registerFolderCommands();
		for (const cmd of commands) {
			expect(cmd.name).toMatch(/^folders\./);
		}
	});

	test("command names are unique", () => {
		const commands = registerFolderCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
