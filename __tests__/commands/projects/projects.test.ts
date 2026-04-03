import { describe, expect, test, vi } from "vitest";
import type { CommandContext } from "../../../src/core/command.js";
import { ValidationError } from "../../../src/lib/errors.js";
import { projectsAddMember } from "../../../src/commands/projects/add-member.js";
import { projectsArchive } from "../../../src/commands/projects/archive.js";
import { projectsCreate } from "../../../src/commands/projects/create.js";
import { projectsGet } from "../../../src/commands/projects/get.js";
import { projectsLeave } from "../../../src/commands/projects/leave.js";
import { projectsList } from "../../../src/commands/projects/list.js";
import { projectsMembers } from "../../../src/commands/projects/members.js";
import { projectsRemoveMember } from "../../../src/commands/projects/remove-member.js";
import { projectsUpdate } from "../../../src/commands/projects/update.js";
import { projectsUpdateRole } from "../../../src/commands/projects/update-role.js";
import { registerProjectCommands } from "../../../src/commands/projects/index.js";

const PROJECT_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const USER_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";

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
// projects.list
// ---------------------------------------------------------------------------

describe("projects.list", () => {
	test("has correct name and group", () => {
		expect(projectsList.name).toBe("projects.list");
		expect(projectsList.group).toBe("projects");
	});

	test("has readOnlyHint annotation", () => {
		expect(projectsList.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /projects with pagination", async () => {
		const ctx = mockContext({ getResult: { items: [], total: 0 } });
		const result = await projectsList.execute({ page: 2, pageSize: 10 }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("projects", {
			queryParams: { page: 2, pageSize: 10 },
		});
		expect(result).toEqual({ items: [], total: 0 });
	});

	test("uses default pagination values", () => {
		const parsed = projectsList.inputSchema.parse({});
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
	});

	test("formatOutput compact returns id or JSON", () => {
		expect(projectsList.formatOutput({ id: "abc" }, "compact")).toBe("abc");
		expect(projectsList.formatOutput([1, 2], "compact")).toBe("[1,2]");
	});

	test("formatOutput json returns pretty JSON", () => {
		const output = { items: [] };
		expect(projectsList.formatOutput(output, "json")).toBe(JSON.stringify(output, null, 2));
	});
});

// ---------------------------------------------------------------------------
// projects.get
// ---------------------------------------------------------------------------

describe("projects.get", () => {
	test("has correct name and group", () => {
		expect(projectsGet.name).toBe("projects.get");
		expect(projectsGet.group).toBe("projects");
	});

	test("requires a valid UUID projectId", () => {
		expect(() => projectsGet.inputSchema.parse({})).toThrow();
		expect(() => projectsGet.inputSchema.parse({ projectId: "not-uuid" })).toThrow();
		expect(projectsGet.inputSchema.parse({ projectId: PROJECT_ID })).toEqual({ projectId: PROJECT_ID });
	});

	test("calls GET /projects/{id}", async () => {
		const ctx = mockContext({ getResult: { id: PROJECT_ID, name: "Test" } });
		const result = await projectsGet.execute({ projectId: PROJECT_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("project", {
			pathParams: { id: PROJECT_ID },
		});
		expect(result).toEqual({ id: PROJECT_ID, name: "Test" });
	});
});

// ---------------------------------------------------------------------------
// projects.create
// ---------------------------------------------------------------------------

describe("projects.create", () => {
	test("has correct name and group", () => {
		expect(projectsCreate.name).toBe("projects.create");
		expect(projectsCreate.group).toBe("projects");
	});

	test("requires name, optional description and icon", () => {
		expect(() => projectsCreate.inputSchema.parse({})).toThrow();
		expect(projectsCreate.inputSchema.parse({ name: "My Project" })).toEqual({ name: "My Project" });
		expect(
			projectsCreate.inputSchema.parse({ name: "P", description: "Desc", icon: "flask" }),
		).toEqual({ name: "P", description: "Desc", icon: "flask" });
	});

	test("calls POST /projects", async () => {
		const ctx = mockContext({ postResult: { id: PROJECT_ID, name: "New" } });
		const result = await projectsCreate.execute({ name: "New" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("projects", { name: "New" });
		expect(result).toEqual({ id: PROJECT_ID, name: "New" });
	});
});

// ---------------------------------------------------------------------------
// projects.update
// ---------------------------------------------------------------------------

describe("projects.update", () => {
	test("has correct name and group", () => {
		expect(projectsUpdate.name).toBe("projects.update");
		expect(projectsUpdate.group).toBe("projects");
	});

	test("throws ValidationError when no fields provided", async () => {
		const ctx = mockContext();
		await expect(
			projectsUpdate.execute({ projectId: PROJECT_ID }, ctx),
		).rejects.toThrow(ValidationError);
	});

	test("calls PATCH /projects/{id} with fields", async () => {
		const ctx = mockContext({ patchResult: { id: PROJECT_ID, name: "Updated" } });
		const result = await projectsUpdate.execute(
			{ projectId: PROJECT_ID, name: "Updated" },
			ctx,
		);
		expect(ctx.client.patch).toHaveBeenCalledWith(
			"project",
			{ name: "Updated" },
			{ pathParams: { id: PROJECT_ID } },
		);
		expect(result).toEqual({ id: PROJECT_ID, name: "Updated" });
	});

	test("accepts description-only update", async () => {
		const ctx = mockContext({ patchResult: {} });
		await projectsUpdate.execute(
			{ projectId: PROJECT_ID, description: "New desc" },
			ctx,
		);
		expect(ctx.client.patch).toHaveBeenCalledWith(
			"project",
			{ description: "New desc" },
			{ pathParams: { id: PROJECT_ID } },
		);
	});
});

// ---------------------------------------------------------------------------
// projects.archive
// ---------------------------------------------------------------------------

describe("projects.archive", () => {
	test("has correct name and group", () => {
		expect(projectsArchive.name).toBe("projects.archive");
		expect(projectsArchive.group).toBe("projects");
	});

	test("has destructiveHint annotation", () => {
		expect(projectsArchive.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /projects/{id} and returns archived result", async () => {
		const ctx = mockContext();
		const result = await projectsArchive.execute({ projectId: PROJECT_ID }, ctx);
		expect(ctx.client.del).toHaveBeenCalledWith("project", {
			pathParams: { id: PROJECT_ID },
		});
		expect(result).toEqual({ archived: true, projectId: PROJECT_ID });
	});

	test("formatOutput compact returns projectId", () => {
		expect(projectsArchive.formatOutput({ archived: true, projectId: PROJECT_ID }, "compact")).toBe(PROJECT_ID);
	});
});

// ---------------------------------------------------------------------------
// projects.members
// ---------------------------------------------------------------------------

describe("projects.members", () => {
	test("has correct name and group", () => {
		expect(projectsMembers.name).toBe("projects.members");
		expect(projectsMembers.group).toBe("projects");
	});

	test("has readOnlyHint annotation", () => {
		expect(projectsMembers.annotations?.readOnlyHint).toBe(true);
	});

	test("calls GET /projects/{id}/members", async () => {
		const members = [{ userId: USER_ID, role: "Admin" }];
		const ctx = mockContext({ getResult: members });
		const result = await projectsMembers.execute({ projectId: PROJECT_ID }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("project_members", {
			pathParams: { id: PROJECT_ID },
		});
		expect(result).toEqual(members);
	});
});

// ---------------------------------------------------------------------------
// projects.addMember
// ---------------------------------------------------------------------------

describe("projects.addMember", () => {
	test("has correct name and group", () => {
		expect(projectsAddMember.name).toBe("projects.addMember");
		expect(projectsAddMember.group).toBe("projects");
	});

	test("defaults role to Member", () => {
		const parsed = projectsAddMember.inputSchema.parse({
			projectId: PROJECT_ID,
			userId: USER_ID,
		});
		expect(parsed.role).toBe("Member");
	});

	test("calls POST /projects/{id}/members", async () => {
		const ctx = mockContext({ postResult: { userId: USER_ID, role: "Member" } });
		const result = await projectsAddMember.execute(
			{ projectId: PROJECT_ID, userId: USER_ID, role: "Member" },
			ctx,
		);
		expect(ctx.client.post).toHaveBeenCalledWith(
			"project_members",
			{ userId: USER_ID, role: "Member" },
			{ pathParams: { id: PROJECT_ID } },
		);
		expect(result).toEqual({ userId: USER_ID, role: "Member" });
	});
});

// ---------------------------------------------------------------------------
// projects.updateRole
// ---------------------------------------------------------------------------

describe("projects.updateRole", () => {
	test("has correct name and group", () => {
		expect(projectsUpdateRole.name).toBe("projects.updateRole");
		expect(projectsUpdateRole.group).toBe("projects");
	});

	test("has idempotentHint annotation", () => {
		expect(projectsUpdateRole.annotations?.idempotentHint).toBe(true);
	});

	test("calls PUT /projects/{id}/members/{uid}/role", async () => {
		const ctx = mockContext({ putResult: { role: "Admin" } });
		const result = await projectsUpdateRole.execute(
			{ projectId: PROJECT_ID, userId: USER_ID, role: "Admin" },
			ctx,
		);
		expect(ctx.client.put).toHaveBeenCalledWith(
			"project_member_role",
			{ role: "Admin" },
			{ pathParams: { id: PROJECT_ID, uid: USER_ID } },
		);
		expect(result).toEqual({ role: "Admin" });
	});
});

// ---------------------------------------------------------------------------
// projects.removeMember
// ---------------------------------------------------------------------------

describe("projects.removeMember", () => {
	test("has correct name and group", () => {
		expect(projectsRemoveMember.name).toBe("projects.removeMember");
		expect(projectsRemoveMember.group).toBe("projects");
	});

	test("has destructiveHint annotation", () => {
		expect(projectsRemoveMember.annotations?.destructiveHint).toBe(true);
	});

	test("calls DELETE /projects/{id}/members/{uid} and returns removed result", async () => {
		const ctx = mockContext();
		const result = await projectsRemoveMember.execute(
			{ projectId: PROJECT_ID, userId: USER_ID },
			ctx,
		);
		expect(ctx.client.del).toHaveBeenCalledWith("project_member", {
			pathParams: { id: PROJECT_ID, uid: USER_ID },
		});
		expect(result).toEqual({ removed: true });
	});

	test("formatOutput compact returns boolean string", () => {
		expect(projectsRemoveMember.formatOutput({ removed: true }, "compact")).toBe("true");
	});
});

// ---------------------------------------------------------------------------
// projects.leave
// ---------------------------------------------------------------------------

describe("projects.leave", () => {
	test("has correct name and group", () => {
		expect(projectsLeave.name).toBe("projects.leave");
		expect(projectsLeave.group).toBe("projects");
	});

	test("has destructiveHint annotation", () => {
		expect(projectsLeave.annotations?.destructiveHint).toBe(true);
	});

	test("calls POST /projects/{id}/leave", async () => {
		const ctx = mockContext({ postResult: { left: true } });
		const result = await projectsLeave.execute({ projectId: PROJECT_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("project_leave", undefined, {
			pathParams: { id: PROJECT_ID },
		});
		expect(result).toEqual({ left: true });
	});
});

// ---------------------------------------------------------------------------
// registerProjectCommands
// ---------------------------------------------------------------------------

describe("registerProjectCommands", () => {
	test("returns all 10 project commands", () => {
		const commands = registerProjectCommands();
		expect(commands).toHaveLength(10);
	});

	test("all commands belong to projects group", () => {
		const commands = registerProjectCommands();
		for (const cmd of commands) {
			expect(cmd.group).toBe("projects");
		}
	});

	test("all command names start with projects.", () => {
		const commands = registerProjectCommands();
		for (const cmd of commands) {
			expect(cmd.name).toMatch(/^projects\./);
		}
	});

	test("command names are unique", () => {
		const commands = registerProjectCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
