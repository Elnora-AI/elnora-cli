import { describe, expect, test, vi } from "vitest";
import { filesArchive } from "../../../src/commands/files/archive.js";
import { filesCommit } from "../../../src/commands/files/commit.js";
import { filesConfirmUpload } from "../../../src/commands/files/confirm-upload.js";
import { filesContent } from "../../../src/commands/files/content.js";
import { filesCreate } from "../../../src/commands/files/create.js";
import { filesCreateVersion } from "../../../src/commands/files/create-version.js";
import { filesDownload } from "../../../src/commands/files/download.js";
import { filesFork } from "../../../src/commands/files/fork.js";
import { filesGet } from "../../../src/commands/files/get.js";
import { registerFileCommands } from "../../../src/commands/files/index.js";
import { filesList } from "../../../src/commands/files/list.js";
import { filesPromote } from "../../../src/commands/files/promote.js";
import { filesRestore } from "../../../src/commands/files/restore.js";
import { filesSearchContent } from "../../../src/commands/files/search-content.js";
import { filesUpdate } from "../../../src/commands/files/update.js";
import { filesUpload } from "../../../src/commands/files/upload.js";
import { filesUploadBatch } from "../../../src/commands/files/upload-batch.js";
import { filesVersionContent } from "../../../src/commands/files/version-content.js";
import { filesVersions } from "../../../src/commands/files/versions.js";
import { filesWorkingCopy } from "../../../src/commands/files/working-copy.js";
import type { CommandContext } from "../../../src/core/command.js";
import { ValidationError } from "../../../src/lib/errors.js";

const FILE_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const PROJECT_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";
const VERSION_ID = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";

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
// files.list
// ---------------------------------------------------------------------------

describe("files.list", () => {
	test("has correct name and group", () => {
		expect(filesList.name).toBe("files.list");
		expect(filesList.group).toBe("files");
	});

	test("has readOnlyHint annotation", () => {
		expect(filesList.annotations?.readOnlyHint).toBe(true);
	});

	test("project is optional; a malformed UUID is rejected", () => {
		// ELN-880: no scope is required — lists the caller's workspace by default.
		expect(filesList.inputSchema.parse({})).toMatchObject({ page: 1, pageSize: 25 });
		expect(() => filesList.inputSchema.parse({ project: "not-uuid" })).toThrow();
	});

	test("uses default pagination values", () => {
		const parsed = filesList.inputSchema.parse({ project: PROJECT_ID });
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
	});

	test("calls GET /projects/{id}/files with pagination when --project is given (legacy)", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await filesList.execute({ project: PROJECT_ID, page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("project_files", {
			pathParams: { id: PROJECT_ID },
			queryParams: { page: 1, pageSize: 25 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});

	test("defaults to GET /folders/files (workspace) when no project is given (ELN-880)", async () => {
		const ctx = mockContext({ getResult: [] });
		await filesList.execute({ page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("folders_files");
	});
});

// ---------------------------------------------------------------------------
// files.get
// ---------------------------------------------------------------------------

describe("files.get", () => {
	test("has correct name and group", () => {
		expect(filesGet.name).toBe("files.get");
		expect(filesGet.group).toBe("files");
	});

	test("requires a valid UUID fileId", () => {
		expect(() => filesGet.inputSchema.parse({})).toThrow();
		expect(() => filesGet.inputSchema.parse({ fileId: "not-uuid" })).toThrow();
		expect(filesGet.inputSchema.parse({ fileId: FILE_ID })).toEqual({ fileId: FILE_ID });
	});

	test("calls GET /files/{id}", async () => {
		const ctx = mockContext({ getResult: { id: FILE_ID, name: "test.txt" } });
		const result = await filesGet.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("file", {
			pathParams: { id: FILE_ID },
		});
		expect(result).toEqual({ id: FILE_ID, name: "test.txt" });
	});
});

// ---------------------------------------------------------------------------
// files.content
// ---------------------------------------------------------------------------

describe("files.content", () => {
	test("has correct name and group", () => {
		expect(filesContent.name).toBe("files.content");
		expect(filesContent.group).toBe("files");
	});

	test("calls GET /files/{id}/content", async () => {
		const ctx = mockContext({ getResult: "file content here" });
		const result = await filesContent.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("file_content", {
			pathParams: { id: FILE_ID },
		});
		expect(result).toBe("file content here");
	});

	test("formatOutput returns raw string", () => {
		expect(filesContent.formatOutput("raw text", "json")).toBe("raw text");
	});
});

// ---------------------------------------------------------------------------
// files.create
// ---------------------------------------------------------------------------

describe("files.create", () => {
	test("has correct name and group", () => {
		expect(filesCreate.name).toBe("files.create");
		expect(filesCreate.group).toBe("files");
	});

	test("requires project, name, and type", () => {
		expect(() => filesCreate.inputSchema.parse({})).toThrow();
		expect(() => filesCreate.inputSchema.parse({ project: PROJECT_ID, name: "f" })).toThrow();
		expect(filesCreate.inputSchema.parse({ project: PROJECT_ID, name: "f.txt", type: "text" })).toEqual({
			project: PROJECT_ID,
			name: "f.txt",
			type: "text",
		});
	});

	test("calls POST /files with fileType (backend field name) and projectId", async () => {
		const ctx = mockContext({ postResult: { id: FILE_ID } });
		const result = await filesCreate.execute({ project: PROJECT_ID, name: "f.txt", type: "text" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("files", {
			projectId: PROJECT_ID,
			name: "f.txt",
			fileType: "text",
			folderId: undefined,
		});
		expect(result).toEqual({ id: FILE_ID });
	});

	test("omits projectId and maps --type to fileType when no project is given (ELN-880)", async () => {
		const ctx = mockContext({ postResult: { id: FILE_ID } });
		await filesCreate.execute({ name: "f.txt", type: "text" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("files", {
			name: "f.txt",
			fileType: "text",
			folderId: undefined,
		});
	});
});

// ---------------------------------------------------------------------------
// files.upload (three-stage)
// ---------------------------------------------------------------------------

describe("files.upload", () => {
	test("has correct name and group", () => {
		expect(filesUpload.name).toBe("files.upload");
		expect(filesUpload.group).toBe("files");
	});

	test("requires project and filePath", () => {
		expect(() => filesUpload.inputSchema.parse({})).toThrow();
		expect(() => filesUpload.inputSchema.parse({ project: PROJECT_ID })).toThrow();
		expect(filesUpload.inputSchema.parse({ project: PROJECT_ID, filePath: "/tmp/file.txt" })).toEqual({
			project: PROJECT_ID,
			filePath: "/tmp/file.txt",
		});
	});
});

// ---------------------------------------------------------------------------
// files.uploadBatch
// ---------------------------------------------------------------------------

describe("files.uploadBatch", () => {
	test("has correct name and group", () => {
		expect(filesUploadBatch.name).toBe("files.uploadBatch");
		expect(filesUploadBatch.group).toBe("files");
	});

	test("requires project and filePaths", () => {
		expect(() => filesUploadBatch.inputSchema.parse({})).toThrow();
		expect(filesUploadBatch.inputSchema.parse({ project: PROJECT_ID, filePaths: "/tmp/a.txt,/tmp/b.txt" })).toEqual({
			project: PROJECT_ID,
			filePaths: "/tmp/a.txt,/tmp/b.txt",
		});
	});
});

// ---------------------------------------------------------------------------
// files.confirmUpload
// ---------------------------------------------------------------------------

describe("files.confirmUpload", () => {
	test("has correct name and group", () => {
		expect(filesConfirmUpload.name).toBe("files.confirmUpload");
		expect(filesConfirmUpload.group).toBe("files");
	});

	test("calls POST /files/{id}/upload/confirm", async () => {
		const ctx = mockContext({ postResult: { confirmed: true } });
		const result = await filesConfirmUpload.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("file_upload_confirm", undefined, {
			pathParams: { id: FILE_ID },
		});
		expect(result).toEqual({ confirmed: true });
	});
});

// ---------------------------------------------------------------------------
// files.download
// ---------------------------------------------------------------------------

describe("files.download", () => {
	test("has correct name and group", () => {
		expect(filesDownload.name).toBe("files.download");
		expect(filesDownload.group).toBe("files");
	});

	test("has readOnlyHint annotation", () => {
		expect(filesDownload.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /files/{id}/download", async () => {
		const ctx = mockContext({ getResult: "binary content" });
		const result = await filesDownload.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("file_download", {
			pathParams: { id: FILE_ID },
		});
		expect(result).toBe("binary content");
	});
});

// ---------------------------------------------------------------------------
// files.update
// ---------------------------------------------------------------------------

describe("files.update", () => {
	test("has correct name and group", () => {
		expect(filesUpdate.name).toBe("files.update");
		expect(filesUpdate.group).toBe("files");
	});

	test("throws ValidationError when no fields provided", async () => {
		const ctx = mockContext();
		await expect(filesUpdate.execute({ fileId: FILE_ID }, ctx)).rejects.toThrow(ValidationError);
	});

	test("calls PATCH /files/{id} with name", async () => {
		const ctx = mockContext({ patchResult: { id: FILE_ID, name: "renamed.txt" } });
		const result = await filesUpdate.execute({ fileId: FILE_ID, name: "renamed.txt" }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith("file", { name: "renamed.txt" }, { pathParams: { id: FILE_ID } });
		expect(result).toEqual({ id: FILE_ID, name: "renamed.txt" });
	});
});

// ---------------------------------------------------------------------------
// files.archive
// ---------------------------------------------------------------------------

describe("files.archive", () => {
	test("has correct name and group", () => {
		expect(filesArchive.name).toBe("files.archive");
		expect(filesArchive.group).toBe("files");
	});

	test("has destructiveHint annotation", () => {
		expect(filesArchive.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /files/{id} and returns archived result", async () => {
		const ctx = mockContext();
		const result = await filesArchive.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("file", {
			pathParams: { id: FILE_ID },
		});
		expect(result).toEqual({ archived: true, fileId: FILE_ID });
	});

	test("formatOutput compact returns fileId", () => {
		expect(filesArchive.formatOutput({ archived: true, fileId: FILE_ID }, "compact")).toBe(FILE_ID);
	});
});

// ---------------------------------------------------------------------------
// files.versions
// ---------------------------------------------------------------------------

describe("files.versions", () => {
	test("has correct name and group", () => {
		expect(filesVersions.name).toBe("files.versions");
		expect(filesVersions.group).toBe("files");
	});

	test("has readOnlyHint annotation", () => {
		expect(filesVersions.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /files/{id}/versions with pagination", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await filesVersions.execute({ fileId: FILE_ID, page: 1, pageSize: 10 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("file_versions", {
			pathParams: { id: FILE_ID },
			queryParams: { page: 1, pageSize: 10 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});
});

// ---------------------------------------------------------------------------
// files.versionContent
// ---------------------------------------------------------------------------

describe("files.versionContent", () => {
	test("has correct name and group", () => {
		expect(filesVersionContent.name).toBe("files.versionContent");
		expect(filesVersionContent.group).toBe("files");
	});

	test("requires fileId and versionId", () => {
		expect(() => filesVersionContent.inputSchema.parse({})).toThrow();
		expect(() => filesVersionContent.inputSchema.parse({ fileId: FILE_ID })).toThrow();
		expect(filesVersionContent.inputSchema.parse({ fileId: FILE_ID, versionId: VERSION_ID })).toEqual({
			fileId: FILE_ID,
			versionId: VERSION_ID,
		});
	});

	test("calls GET /files/{id}/versions/{vid}/content", async () => {
		const ctx = mockContext({ getResult: "version content" });
		const result = await filesVersionContent.execute({ fileId: FILE_ID, versionId: VERSION_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("file_version_content", {
			pathParams: { id: FILE_ID, vid: VERSION_ID },
		});
		expect(result).toBe("version content");
	});
});

// ---------------------------------------------------------------------------
// files.createVersion
// ---------------------------------------------------------------------------

describe("files.createVersion", () => {
	test("has correct name and group", () => {
		expect(filesCreateVersion.name).toBe("files.createVersion");
		expect(filesCreateVersion.group).toBe("files");
	});

	test("calls POST /files/{id}/versions", async () => {
		const ctx = mockContext({ postResult: { id: VERSION_ID } });
		const result = await filesCreateVersion.execute({ fileId: FILE_ID, content: "new content" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"file_versions",
			{ content: "new content" },
			{ pathParams: { id: FILE_ID } },
		);
		expect(result).toEqual({ id: VERSION_ID });
	});

	test("sends empty body when no content provided", async () => {
		const ctx = mockContext({ postResult: { id: VERSION_ID } });
		await filesCreateVersion.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("file_versions", {}, { pathParams: { id: FILE_ID } });
	});
});

// ---------------------------------------------------------------------------
// files.restore
// ---------------------------------------------------------------------------

describe("files.restore", () => {
	test("has correct name and group", () => {
		expect(filesRestore.name).toBe("files.restore");
		expect(filesRestore.group).toBe("files");
	});

	test("calls POST /files/{id}/versions/{vid}/restore", async () => {
		const ctx = mockContext({ postResult: { restored: true } });
		const result = await filesRestore.execute({ fileId: FILE_ID, versionId: VERSION_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("file_version_restore", undefined, {
			pathParams: { id: FILE_ID, vid: VERSION_ID },
		});
		expect(result).toEqual({ restored: true });
	});
});

// ---------------------------------------------------------------------------
// files.promote
// ---------------------------------------------------------------------------

describe("files.promote", () => {
	test("has correct name and group", () => {
		expect(filesPromote.name).toBe("files.promote");
		expect(filesPromote.group).toBe("files");
	});

	test("calls POST /files/{id}/promote", async () => {
		const ctx = mockContext({ postResult: { promoted: true } });
		const result = await filesPromote.execute({ fileId: FILE_ID, visibility: "public" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"file_promote",
			{ visibility: "public" },
			{ pathParams: { id: FILE_ID } },
		);
		expect(result).toEqual({ promoted: true });
	});
});

// ---------------------------------------------------------------------------
// files.fork
// ---------------------------------------------------------------------------

describe("files.fork", () => {
	test("has correct name and group", () => {
		expect(filesFork.name).toBe("files.fork");
		expect(filesFork.group).toBe("files");
	});

	test("requires fileId; target project is optional", () => {
		// ELN-880: omit --target-project → backend forks into the caller's default workspace.
		expect(() => filesFork.inputSchema.parse({})).toThrow();
		expect(filesFork.inputSchema.parse({ fileId: FILE_ID })).toMatchObject({ fileId: FILE_ID });
		expect(() => filesFork.inputSchema.parse({ fileId: FILE_ID, targetProject: "not-uuid" })).toThrow();
	});

	test("calls POST /files/{id}/fork with a target project", async () => {
		const ctx = mockContext({ postResult: { id: "new-file-id" } });
		const result = await filesFork.execute({ fileId: FILE_ID, targetProject: PROJECT_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"file_fork",
			{ targetProjectId: PROJECT_ID },
			{ pathParams: { id: FILE_ID } },
		);
		expect(result).toEqual({ id: "new-file-id" });
	});

	test("forks into the workspace (empty body) when no target is given (ELN-880)", async () => {
		const ctx = mockContext({ postResult: { id: "new-file-id" } });
		await filesFork.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("file_fork", {}, { pathParams: { id: FILE_ID } });
	});
});

// ---------------------------------------------------------------------------
// files.workingCopy
// ---------------------------------------------------------------------------

describe("files.workingCopy", () => {
	test("has correct name and group", () => {
		expect(filesWorkingCopy.name).toBe("files.workingCopy");
		expect(filesWorkingCopy.group).toBe("files");
	});

	test("calls POST /files/{id}/working-copy", async () => {
		const ctx = mockContext({ postResult: { id: "wc-id" } });
		const result = await filesWorkingCopy.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("file_working_copy", {}, { pathParams: { id: FILE_ID } });
		expect(result).toEqual({ id: "wc-id" });
	});

	test("passes task when provided", async () => {
		const taskId = "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f";
		const ctx = mockContext({ postResult: { id: "wc-id" } });
		await filesWorkingCopy.execute({ fileId: FILE_ID, task: taskId }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("file_working_copy", { taskId }, { pathParams: { id: FILE_ID } });
	});
});

// ---------------------------------------------------------------------------
// files.commit
// ---------------------------------------------------------------------------

describe("files.commit", () => {
	test("has correct name and group", () => {
		expect(filesCommit.name).toBe("files.commit");
		expect(filesCommit.group).toBe("files");
	});

	test("calls POST /files/{id}/commit", async () => {
		const ctx = mockContext({ postResult: { committed: true } });
		const result = await filesCommit.execute({ fileId: FILE_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("file_commit", undefined, {
			pathParams: { id: FILE_ID },
		});
		expect(result).toEqual({ committed: true });
	});
});

// ---------------------------------------------------------------------------
// files.searchContent
// ---------------------------------------------------------------------------

describe("files.searchContent", () => {
	test("has correct name and group", () => {
		expect(filesSearchContent.name).toBe("files.searchContent");
		expect(filesSearchContent.group).toBe("files");
	});

	test("has readOnlyHint annotation", () => {
		expect(filesSearchContent.annotations?.readOnlyHint).toBe(true);
	});

	test("requires query", () => {
		expect(() => filesSearchContent.inputSchema.parse({})).toThrow();
		expect(filesSearchContent.inputSchema.parse({ query: "test" })).toEqual({
			query: "test",
			page: 1,
			pageSize: 25,
		});
	});

	test("calls GET /search/file-content with query params", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await filesSearchContent.execute({ query: "PCR", page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("search_file_content", {
			queryParams: { q: "PCR", page: 1, pageSize: 25 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});

	test("includes projectId when project is provided", async () => {
		const ctx = mockContext({ getResult: { items: [] } });
		await filesSearchContent.execute({ query: "PCR", project: PROJECT_ID, page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("search_file_content", {
			queryParams: { q: "PCR", projectId: PROJECT_ID, page: 1, pageSize: 25 },
		});
	});
});

// ---------------------------------------------------------------------------
// registerFileCommands
// ---------------------------------------------------------------------------

describe("registerFileCommands", () => {
	test("returns all 19 file commands", () => {
		const commands = registerFileCommands();
		expect(commands).toHaveLength(19);
	});

	test("all commands belong to files group", () => {
		const commands = registerFileCommands();
		for (const cmd of commands) {
			expect(cmd.group).toBe("files");
		}
	});

	test("all command names start with files.", () => {
		const commands = registerFileCommands();
		for (const cmd of commands) {
			expect(cmd.name).toMatch(/^files\./);
		}
	});

	test("command names are unique", () => {
		const commands = registerFileCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
