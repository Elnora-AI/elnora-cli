import { describe, expect, test, vi } from "vitest";
import { tasksArchive } from "../../../src/commands/tasks/archive.js";
import { tasksAttachmentContent } from "../../../src/commands/tasks/attachment-content.js";
import { tasksAttachments } from "../../../src/commands/tasks/attachments.js";
import { tasksCreate } from "../../../src/commands/tasks/create.js";
import { tasksGet } from "../../../src/commands/tasks/get.js";
import { registerTaskCommands } from "../../../src/commands/tasks/index.js";
import { tasksList } from "../../../src/commands/tasks/list.js";
import { tasksMessages } from "../../../src/commands/tasks/messages.js";
import { tasksSend } from "../../../src/commands/tasks/send.js";
import { tasksUnarchive } from "../../../src/commands/tasks/unarchive.js";
import { tasksUpdate } from "../../../src/commands/tasks/update.js";
import type { CommandContext } from "../../../src/core/command.js";
import { ValidationError } from "../../../src/lib/errors.js";

const TASK_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const PROJECT_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";
const FILE_ID_1 = "11111111-2222-3333-4444-555555555555";
const FILE_ID_2 = "66666666-7777-8888-9999-aaaaaaaaaaaa";

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
// tasks.list
// ---------------------------------------------------------------------------

describe("tasks.list", () => {
	test("has correct name and group", () => {
		expect(tasksList.name).toBe("tasks.list");
		expect(tasksList.group).toBe("tasks");
	});

	test("has readOnlyHint annotation", () => {
		expect(tasksList.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /tasks with pagination when no project", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await tasksList.execute({ page: 2, pageSize: 10 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("tasks", {
			queryParams: { page: 2, pageSize: 10 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});

	test("returns the deprecation no-op when project provided (ELN-880/881)", async () => {
		const ctx = mockContext({ getResult: { items: [] } });
		const result = await tasksList.execute({ project: PROJECT_ID, page: 1, pageSize: 25 }, ctx);
		// The /projects/{id}/tasks route was retired and now 404s — never call it.
		expect(ctx.client.get).not.toHaveBeenCalled();
		expect(result).toMatchObject({ deprecated: true });
	});

	test("uses default pagination values", () => {
		const parsed = tasksList.inputSchema.parse({});
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
		expect(parsed.project).toBeUndefined();
	});

	test("rejects invalid project UUID", () => {
		expect(() => tasksList.inputSchema.parse({ project: "not-uuid" })).toThrow();
	});

	test("includes status in queryParams when provided", async () => {
		const ctx = mockContext({ getResult: { items: [] } });
		await tasksList.execute({ status: "archived", page: 1, pageSize: 25 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("tasks", {
			queryParams: { page: 1, pageSize: 25, status: "archived" },
		});
	});

	test("formatOutput compact returns id or JSON", () => {
		expect(tasksList.formatOutput({ id: "abc" }, "compact")).toBe("abc");
		expect(tasksList.formatOutput([1, 2], "compact")).toBe("[1,2]");
	});

	test("formatOutput json returns pretty JSON", () => {
		const output = { items: [] };
		expect(tasksList.formatOutput(output, "json")).toBe(JSON.stringify(output, null, 2));
	});
});

// ---------------------------------------------------------------------------
// tasks.get
// ---------------------------------------------------------------------------

describe("tasks.get", () => {
	test("has correct name and group", () => {
		expect(tasksGet.name).toBe("tasks.get");
		expect(tasksGet.group).toBe("tasks");
	});

	test("has readOnlyHint annotation", () => {
		expect(tasksGet.annotations?.readOnlyHint).toBe(true);
	});

	test("requires a valid UUID taskId", () => {
		expect(() => tasksGet.inputSchema.parse({})).toThrow();
		expect(() => tasksGet.inputSchema.parse({ taskId: "not-uuid" })).toThrow();
		expect(tasksGet.inputSchema.parse({ taskId: TASK_ID })).toEqual({ taskId: TASK_ID });
	});

	test("calls GET /tasks/{id}", async () => {
		const ctx = mockContext({ getResult: { id: TASK_ID, title: "Test Task" } });
		const result = await tasksGet.execute({ taskId: TASK_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("task", {
			pathParams: { id: TASK_ID },
		});
		expect(result).toEqual({ id: TASK_ID, title: "Test Task" });
	});
});

// ---------------------------------------------------------------------------
// tasks.create
// ---------------------------------------------------------------------------

describe("tasks.create", () => {
	test("has correct name and group", () => {
		expect(tasksCreate.name).toBe("tasks.create");
		expect(tasksCreate.group).toBe("tasks");
	});

	test("project is optional and rejects a malformed UUID", () => {
		// ELN-880: projectId is optional — the backend creates the task in the caller's default workspace.
		expect(tasksCreate.inputSchema.parse({})).toMatchObject({ wait: false, stream: false });
		expect(() => tasksCreate.inputSchema.parse({ project: "not-uuid" })).toThrow();
	});

	test("accepts project with optional title and message", () => {
		const parsed = tasksCreate.inputSchema.parse({ project: PROJECT_ID });
		expect(parsed).toEqual({ project: PROJECT_ID, stream: false, wait: false });

		const full = tasksCreate.inputSchema.parse({
			project: PROJECT_ID,
			title: "My Task",
			message: "Hello",
		});
		expect(full).toEqual({ project: PROJECT_ID, title: "My Task", message: "Hello", stream: false, wait: false });
	});

	test("calls POST /tasks with mapped body", async () => {
		const ctx = mockContext({ postResult: { id: TASK_ID } });
		const result = await tasksCreate.execute(
			{ project: PROJECT_ID, title: "My Task", message: "Hello", stream: false, wait: false },
			ctx,
		);
		expect(ctx.client.post).toHaveBeenCalledWith("tasks", {
			projectId: PROJECT_ID,
			title: "My Task",
			initialMessage: "Hello",
		});
		expect(result).toEqual({ id: TASK_ID });
	});

	test("calls POST /tasks without optional fields", async () => {
		const ctx = mockContext({ postResult: { id: TASK_ID } });
		await tasksCreate.execute({ project: PROJECT_ID, stream: false, wait: false }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("tasks", {
			projectId: PROJECT_ID,
			title: undefined,
			initialMessage: undefined,
		});
	});

	test("omits projectId from the body when no project is supplied (ELN-880)", async () => {
		const ctx = mockContext({ postResult: { id: TASK_ID } });
		await tasksCreate.execute({ stream: false, wait: false }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("tasks", {
			title: undefined,
			initialMessage: undefined,
		});
	});
});

// ---------------------------------------------------------------------------
// tasks.send
// ---------------------------------------------------------------------------

describe("tasks.send", () => {
	test("has correct name and group", () => {
		expect(tasksSend.name).toBe("tasks.send");
		expect(tasksSend.group).toBe("tasks");
	});

	test("requires taskId and message", () => {
		expect(() => tasksSend.inputSchema.parse({})).toThrow();
		expect(() => tasksSend.inputSchema.parse({ taskId: TASK_ID })).toThrow();
		expect(() => tasksSend.inputSchema.parse({ message: "hi" })).toThrow();
	});

	test("calls POST /tasks/{id}/messages with content", async () => {
		const ctx = mockContext({ postResult: { id: "msg-1" } });
		const result = await tasksSend.execute({ taskId: TASK_ID, message: "Hello" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"task_messages",
			{ content: "Hello", referencedFileIds: undefined },
			{ pathParams: { id: TASK_ID } },
		);
		expect(result).toEqual({ id: "msg-1" });
	});

	test("parses fileRefs into array of UUIDs", async () => {
		const ctx = mockContext({ postResult: {} });
		await tasksSend.execute({ taskId: TASK_ID, message: "Check these", fileRefs: `${FILE_ID_1}, ${FILE_ID_2}` }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"task_messages",
			{ content: "Check these", referencedFileIds: [FILE_ID_1, FILE_ID_2] },
			{ pathParams: { id: TASK_ID } },
		);
	});

	test("filters out non-UUID strings from fileRefs", async () => {
		const ctx = mockContext({ postResult: {} });
		await tasksSend.execute(
			{ taskId: TASK_ID, message: "test", fileRefs: `${FILE_ID_1}, not-a-uuid, , ${FILE_ID_2}` },
			ctx,
		);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"task_messages",
			{ content: "test", referencedFileIds: [FILE_ID_1, FILE_ID_2] },
			{ pathParams: { id: TASK_ID } },
		);
	});

	test("handles empty fileRefs string", async () => {
		const ctx = mockContext({ postResult: {} });
		await tasksSend.execute({ taskId: TASK_ID, message: "test", fileRefs: "" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"task_messages",
			{ content: "test", referencedFileIds: undefined },
			{ pathParams: { id: TASK_ID } },
		);
	});

	test("input schema accepts --wait and --stream flags", () => {
		const parsed = tasksSend.inputSchema.parse({
			taskId: TASK_ID,
			message: "hello",
			wait: true,
			stream: false,
		});
		expect(parsed.wait).toBe(true);
		expect(parsed.stream).toBe(false);
	});

	test("flags default to false", () => {
		const parsed = tasksSend.inputSchema.parse({
			taskId: TASK_ID,
			message: "hello",
		});
		expect(parsed.wait).toBe(false);
		expect(parsed.stream).toBe(false);
	});

	test("fire-and-forget returns immediately when no flags", async () => {
		const ctx = mockContext({ postResult: { id: "msg-1", sequence: 1 } });
		const result = await tasksSend.execute({ taskId: TASK_ID, message: "hello", wait: false, stream: false }, ctx);
		expect(result).toEqual({ id: "msg-1", sequence: 1 });
	});
});

// ---------------------------------------------------------------------------
// tasks.messages
// ---------------------------------------------------------------------------

describe("tasks.messages", () => {
	test("has correct name and group", () => {
		expect(tasksMessages.name).toBe("tasks.messages");
		expect(tasksMessages.group).toBe("tasks");
	});

	test("has readOnlyHint annotation", () => {
		expect(tasksMessages.annotations?.readOnlyHint).toBe(true);
	});

	test("requires taskId, defaults limit to 50", () => {
		expect(() => tasksMessages.inputSchema.parse({})).toThrow();
		const parsed = tasksMessages.inputSchema.parse({ taskId: TASK_ID });
		expect(parsed.limit).toBe(50);
		expect(parsed.cursor).toBeUndefined();
	});

	test("calls GET /tasks/{id}/messages with limit", async () => {
		const ctx = mockContext({ getResult: { messages: [], nextCursor: null } });
		const result = await tasksMessages.execute({ taskId: TASK_ID, limit: 50 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("task_messages", {
			pathParams: { id: TASK_ID },
			queryParams: { limit: 50 },
		});
		expect(result).toEqual({ messages: [], nextCursor: null });
	});

	test("passes cursor when provided", async () => {
		const ctx = mockContext({ getResult: {} });
		await tasksMessages.execute({ taskId: TASK_ID, cursor: "abc123", limit: 20 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("task_messages", {
			pathParams: { id: TASK_ID },
			queryParams: { limit: 20, cursor: "abc123" },
		});
	});
});

// ---------------------------------------------------------------------------
// tasks.update
// ---------------------------------------------------------------------------

describe("tasks.update", () => {
	test("has correct name and group", () => {
		expect(tasksUpdate.name).toBe("tasks.update");
		expect(tasksUpdate.group).toBe("tasks");
	});

	test("has idempotentHint annotation", () => {
		expect(tasksUpdate.annotations?.idempotentHint).toBe(true);
	});

	test("throws ValidationError when no fields provided", async () => {
		const ctx = mockContext();
		await expect(tasksUpdate.execute({ taskId: TASK_ID }, ctx)).rejects.toThrow(ValidationError);
	});

	test("calls PATCH /tasks/{id} with title", async () => {
		const ctx = mockContext({ patchResult: { id: TASK_ID, title: "Updated" } });
		const result = await tasksUpdate.execute({ taskId: TASK_ID, title: "Updated" }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith("task", { title: "Updated" }, { pathParams: { id: TASK_ID } });
		expect(result).toEqual({ id: TASK_ID, title: "Updated" });
	});

	test("calls PATCH /tasks/{id} with status", async () => {
		const ctx = mockContext({ patchResult: {} });
		await tasksUpdate.execute({ taskId: TASK_ID, status: "completed" }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith("task", { status: "completed" }, { pathParams: { id: TASK_ID } });
	});

	test("accepts both title and status", async () => {
		const ctx = mockContext({ patchResult: {} });
		await tasksUpdate.execute({ taskId: TASK_ID, title: "New Title", status: "active" }, ctx);
		expect(ctx.client.patch).toHaveBeenCalledWith(
			"task",
			{ title: "New Title", status: "active" },
			{ pathParams: { id: TASK_ID } },
		);
	});
});

// ---------------------------------------------------------------------------
// tasks.archive
// ---------------------------------------------------------------------------

describe("tasks.archive", () => {
	test("has correct name and group", () => {
		expect(tasksArchive.name).toBe("tasks.archive");
		expect(tasksArchive.group).toBe("tasks");
	});

	test("has destructiveHint annotation", () => {
		expect(tasksArchive.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /tasks/{id} and returns archived result", async () => {
		const ctx = mockContext();
		const result = await tasksArchive.execute({ taskId: TASK_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("task", {
			pathParams: { id: TASK_ID },
		});
		expect(result).toEqual({ archived: true, taskId: TASK_ID });
	});

	test("formatOutput compact returns taskId", () => {
		expect(tasksArchive.formatOutput({ archived: true, taskId: TASK_ID }, "compact")).toBe(TASK_ID);
	});

	test("formatOutput json returns pretty JSON", () => {
		const output = { archived: true, taskId: TASK_ID };
		expect(tasksArchive.formatOutput(output, "json")).toBe(JSON.stringify(output, null, 2));
	});
});

// ---------------------------------------------------------------------------
// tasks.unarchive / attachments / attachmentContent
// ---------------------------------------------------------------------------

describe("tasks.unarchive", () => {
	test("POSTs the unarchive endpoint and returns unarchived", async () => {
		const ctx = mockContext();
		const result = await tasksUnarchive.execute({ taskId: TASK_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("task_unarchive", {}, { pathParams: { id: TASK_ID } });
		expect(result).toEqual({ unarchived: true, taskId: TASK_ID });
	});
});

describe("tasks.attachments", () => {
	test("is read-only and GETs the attachments list", async () => {
		expect(tasksAttachments.annotations?.readOnlyHint).toBe(true);
		const ctx = mockContext({ getResult: [] });
		await tasksAttachments.execute({ taskId: TASK_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("task_attachments", { pathParams: { id: TASK_ID } });
	});
});

describe("tasks.attachmentContent", () => {
	test("GETs the attachment content with both path params", async () => {
		const ctx = mockContext({ getResult: { content: "hi" } });
		await tasksAttachmentContent.execute({ taskId: TASK_ID, attachmentId: FILE_ID_1 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("task_attachment_content", {
			pathParams: { id: TASK_ID, aid: FILE_ID_1 },
		});
	});
});

// ---------------------------------------------------------------------------
// registerTaskCommands
// ---------------------------------------------------------------------------

describe("registerTaskCommands", () => {
	test("returns all 10 task commands", () => {
		const commands = registerTaskCommands();
		expect(commands).toHaveLength(10);
	});

	test("all commands belong to tasks group", () => {
		const commands = registerTaskCommands();
		for (const cmd of commands) {
			expect(cmd.group).toBe("tasks");
		}
	});

	test("all command names start with tasks.", () => {
		const commands = registerTaskCommands();
		for (const cmd of commands) {
			expect(cmd.name).toMatch(/^tasks\./);
		}
	});

	test("command names are unique", () => {
		const commands = registerTaskCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
