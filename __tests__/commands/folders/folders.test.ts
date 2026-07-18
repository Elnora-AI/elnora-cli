import { describe, expect, test, vi } from "vitest";
import { foldersChildren } from "../../../src/commands/folders/children.js";
import { foldersCreate } from "../../../src/commands/folders/create.js";
import { foldersDelete } from "../../../src/commands/folders/delete.js";
import { foldersFiles } from "../../../src/commands/folders/files.js";
import { foldersGet } from "../../../src/commands/folders/get.js";
import { registerFolderCommands } from "../../../src/commands/folders/index.js";
import { foldersList } from "../../../src/commands/folders/list.js";
import { foldersMove } from "../../../src/commands/folders/move.js";
import { foldersRename } from "../../../src/commands/folders/rename.js";
import { foldersRoots } from "../../../src/commands/folders/roots.js";
import { foldersShare } from "../../../src/commands/folders/share.js";
import { foldersShares } from "../../../src/commands/folders/shares.js";
import { foldersUnshare } from "../../../src/commands/folders/unshare.js";
import type { CommandContext } from "../../../src/core/command.js";
import { ValidationError } from "../../../src/lib/errors.js";

const PROJECT_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const FOLDER_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";
const PARENT_ID = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
const ACE_ID = "e5f6a7b8-c9d0-4e1f-9a2b-3c4d5e6f7a8b";

function mockContext(overrides?: {
	getResult?: unknown;
	postResult?: unknown;
	patchResult?: unknown;
	putResult?: unknown;
	delResult?: unknown;
}): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? {}),
			post: vi.fn().mockResolvedValue(overrides?.postResult ?? {}),
			patch: vi.fn().mockResolvedValue(overrides?.patchResult ?? {}),
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

	test("is a deprecated no-op (projects removed; no backend call)", async () => {
		const ctx = mockContext();
		const result = await foldersList.execute({ projectId: PROJECT_ID }, ctx);
		expect(ctx.client.get).not.toHaveBeenCalled();
		expect(result).toMatchObject({ deprecated: true });
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

	test("requires name; projectId is no longer required", () => {
		expect(() => foldersCreate.inputSchema.parse({})).toThrow();
		expect(foldersCreate.inputSchema.parse({ name: "Folder" })).toMatchObject({ name: "Folder" });
	});

	test("POSTs to the KB folder collection by default", async () => {
		const ctx = mockContext({ postResult: { id: FOLDER_ID, name: "New" } });
		const result = await foldersCreate.execute({ name: "New" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("folder_create", { name: "New" });
		expect(result).toEqual({ id: FOLDER_ID, name: "New" });
	});

	test("includes parentFolderId when parentId is provided", async () => {
		const ctx = mockContext({ postResult: { id: FOLDER_ID } });
		await foldersCreate.execute({ name: "Sub", parentId: PARENT_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("folder_create", { name: "Sub", parentFolderId: PARENT_ID });
	});

	test("no-ops the legacy --project path (projects removed; no backend call)", async () => {
		const ctx = mockContext();
		const result = await foldersCreate.execute({ name: "Leg", project: PROJECT_ID }, ctx);
		expect(ctx.client.post).not.toHaveBeenCalled();
		expect(result).toMatchObject({ deprecated: true });
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

	test("PATCHes the KB folder by default", async () => {
		const ctx = mockContext({ patchResult: { id: FOLDER_ID, name: "Renamed" } });
		const result = await foldersRename.execute({ folderId: FOLDER_ID, name: "Renamed", legacy: false }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith("folder", { name: "Renamed" }, { pathParams: { id: FOLDER_ID } });
		expect(result).toEqual({ id: FOLDER_ID, name: "Renamed" });
	});

	test("PUTs the legacy folder when --legacy is set", async () => {
		const ctx = mockContext({ putResult: { id: FOLDER_ID } });
		await foldersRename.execute({ folderId: FOLDER_ID, name: "Renamed", legacy: true }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith("folder", { name: "Renamed" }, { pathParams: { id: FOLDER_ID } });
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

	test("PATCHes folder_move with parentFolderId for a UUID parent", async () => {
		const ctx = mockContext({ patchResult: { id: FOLDER_ID } });
		await foldersMove.execute({ folderId: FOLDER_ID, parentId: PARENT_ID, legacy: false }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith(
			"folder_move",
			{ parentFolderId: PARENT_ID },
			{ pathParams: { id: FOLDER_ID } },
		);
	});

	test("PATCHes folder with moveToRoot when 'root' is provided", async () => {
		const ctx = mockContext({ patchResult: { id: FOLDER_ID } });
		await foldersMove.execute({ folderId: FOLDER_ID, parentId: "root", legacy: false }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith("folder", { moveToRoot: true }, { pathParams: { id: FOLDER_ID } });
	});

	test("PUTs legacy folder_move with newParentFolderId when --legacy is set", async () => {
		const ctx = mockContext({ putResult: { id: FOLDER_ID } });
		await foldersMove.execute({ folderId: FOLDER_ID, parentId: PARENT_ID, legacy: true }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"folder_move",
			{ newParentFolderId: PARENT_ID },
			{ pathParams: { id: FOLDER_ID } },
		);
	});

	test("legacy move to 'root' sends null newParentFolderId", async () => {
		const ctx = mockContext({ putResult: { id: FOLDER_ID } });
		await foldersMove.execute({ folderId: FOLDER_ID, parentId: "root", legacy: true }, ctx);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"folder_move",
			{ newParentFolderId: null },
			{ pathParams: { id: FOLDER_ID } },
		);
	});

	test("throws ValidationError for invalid parent value", async () => {
		const ctx = mockContext();
		await expect(
			foldersMove.execute({ folderId: FOLDER_ID, parentId: "invalid-string", legacy: false }, ctx),
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

	test("archives the KB folder by default", async () => {
		const ctx = mockContext();
		const result = await foldersDelete.execute({ folderId: FOLDER_ID, legacy: false }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("folder_archive", {}, { pathParams: { id: FOLDER_ID } });
		expect(result).toEqual({ archived: true, folderId: FOLDER_ID });
	});

	test("hard-deletes the legacy folder when --legacy is set", async () => {
		const ctx = mockContext();
		const result = await foldersDelete.execute({ folderId: FOLDER_ID, legacy: true }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("folder", { pathParams: { id: FOLDER_ID } });
		expect(result).toEqual({ deleted: true, folderId: FOLDER_ID });
	});

	test("formatOutput compact returns folderId", () => {
		expect(foldersDelete.formatOutput({ archived: true, folderId: FOLDER_ID }, "compact")).toBe(FOLDER_ID);
	});
});

// ---------------------------------------------------------------------------
// Knowledge Base read commands (roots / children / get / files)
// ---------------------------------------------------------------------------

describe("folders.roots", () => {
	test("is read-only and takes no args", () => {
		expect(foldersRoots.annotations?.readOnlyHint).toBe(true);
		expect(foldersRoots.inputSchema.parse({})).toEqual({});
	});

	test("calls GET /folders/roots", async () => {
		const ctx = mockContext({ getResult: [{ id: FOLDER_ID, name: "Knowledge Base" }] });
		await foldersRoots.execute({}, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("folder_roots");
	});
});

describe("folders.children", () => {
	test("requires a valid folderId", () => {
		expect(() => foldersChildren.inputSchema.parse({})).toThrow();
		expect(() => foldersChildren.inputSchema.parse({ folderId: "bad" })).toThrow();
	});

	test("calls GET /folders/{id}/children", async () => {
		const ctx = mockContext({ getResult: [] });
		await foldersChildren.execute({ folderId: FOLDER_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("folder_children", { pathParams: { id: FOLDER_ID } });
	});
});

describe("folders.get", () => {
	test("requires a valid folderId", () => {
		expect(() => foldersGet.inputSchema.parse({})).toThrow();
	});

	test("calls GET /folders/{id}", async () => {
		const ctx = mockContext({ getResult: { id: FOLDER_ID, breadcrumbs: [] } });
		await foldersGet.execute({ folderId: FOLDER_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("folder", { pathParams: { id: FOLDER_ID } });
	});
});

describe("folders.files", () => {
	test("requires a valid folderId and defaults pagination", () => {
		expect(() => foldersFiles.inputSchema.parse({})).toThrow();
		expect(foldersFiles.inputSchema.parse({ folderId: FOLDER_ID })).toMatchObject({ page: 1, pageSize: 25 });
	});

	test("calls GET /folders/{id}/files with pagination", async () => {
		const ctx = mockContext({ getResult: { items: [], totalCount: 0 } });
		await foldersFiles.execute({ folderId: FOLDER_ID, page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("folder_files", {
			pathParams: { id: FOLDER_ID },
			queryParams: { page: 1, pageSize: 25 },
		});
	});
});

// ---------------------------------------------------------------------------
// folders.share / unshare / shares (KB Access V2)
// ---------------------------------------------------------------------------

describe("folders.share", () => {
	test("shares with a specific user (POST folder_share)", async () => {
		const ctx = mockContext({ postResult: { id: ACE_ID } });
		await foldersShare.execute({ folderId: FOLDER_ID, userId: 42, orgWide: false, role: "editor" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"folder_share",
			{ userId: 42, role: "editor" },
			{ pathParams: { id: FOLDER_ID } },
		);
	});

	test("shares org-wide", async () => {
		const ctx = mockContext({ postResult: { id: ACE_ID } });
		await foldersShare.execute({ folderId: FOLDER_ID, orgWide: true, role: "admin" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"folder_share",
			{ isOrgWide: true, role: "admin" },
			{ pathParams: { id: FOLDER_ID } },
		);
	});

	test("rejects both user and org-wide", async () => {
		const ctx = mockContext();
		await expect(
			foldersShare.execute({ folderId: FOLDER_ID, userId: 42, orgWide: true, role: "editor" }, ctx),
		).rejects.toThrow(ValidationError);
	});
});

describe("folders.unshare", () => {
	test("DELETEs folder_share_ace and returns revoked", async () => {
		const ctx = mockContext();
		const result = await foldersUnshare.execute({ folderId: FOLDER_ID, aceId: ACE_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("folder_share_ace", {
			pathParams: { id: FOLDER_ID, aceId: ACE_ID },
		});
		expect(result).toEqual({ revoked: true, folderId: FOLDER_ID, aceId: ACE_ID });
	});
});

describe("folders.shares", () => {
	test("is read-only and GETs folder_shares", async () => {
		const ctx = mockContext({ getResult: [] });
		expect(foldersShares.annotations?.readOnlyHint).toBe(true);
		await foldersShares.execute({ folderId: FOLDER_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("folder_shares", { pathParams: { id: FOLDER_ID } });
	});
});

// ---------------------------------------------------------------------------
// registerFolderCommands
// ---------------------------------------------------------------------------

describe("registerFolderCommands", () => {
	test("returns all 12 folder commands", () => {
		const commands = registerFolderCommands();
		expect(commands).toHaveLength(12);
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
