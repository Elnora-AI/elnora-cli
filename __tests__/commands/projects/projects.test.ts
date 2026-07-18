import { describe, expect, test, vi } from "vitest";
import { projectsAddMember } from "../../../src/commands/projects/add-member.js";
import { projectsArchive } from "../../../src/commands/projects/archive.js";
import { projectsCreate } from "../../../src/commands/projects/create.js";
import { projectsGet } from "../../../src/commands/projects/get.js";
import { registerProjectCommands } from "../../../src/commands/projects/index.js";
import { projectsLeave } from "../../../src/commands/projects/leave.js";
import { projectsList } from "../../../src/commands/projects/list.js";
import { projectsMembers } from "../../../src/commands/projects/members.js";
import { projectsRemoveMember } from "../../../src/commands/projects/remove-member.js";
import { projectsUpdate } from "../../../src/commands/projects/update.js";
import { projectsUpdateRole } from "../../../src/commands/projects/update-role.js";
import type { CommandContext } from "../../../src/core/command.js";

const PROJECT_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const USER_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";

function mockContext(): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue({}),
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

/**
 * Every project command is a deprecated no-op (ELN-880/881 removed the "project"
 * concept). They stay registered — same names + input schemas so the CLI↔MCP
 * parity gate keeps resolving — but must NOT call the backend `/projects` shim.
 */
function expectNoBackendCall(ctx: CommandContext): void {
	expect(ctx.client.get).not.toHaveBeenCalled();
	expect(ctx.client.post).not.toHaveBeenCalled();
	expect(ctx.client.patch).not.toHaveBeenCalled();
	expect(ctx.client.put).not.toHaveBeenCalled();
	expect(ctx.client.del).not.toHaveBeenCalled();
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

	test("uses default pagination values", () => {
		const parsed = projectsList.inputSchema.parse({});
		expect(parsed.page).toBe(1);
		expect(parsed.pageSize).toBe(25);
	});

	test("is a deprecated no-op returning an empty page (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsList.execute({ page: 2, pageSize: 10 }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true, items: [], totalCount: 0, page: 2, pageSize: 10 });
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

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsGet.execute({ projectId: PROJECT_ID }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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
		expect(projectsCreate.inputSchema.parse({ name: "P", description: "Desc", icon: "flask" })).toEqual({
			name: "P",
			description: "Desc",
			icon: "flask",
		});
	});

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsCreate.execute({ name: "New" }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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

	test("is a deprecated no-op (no backend call, no validation error)", async () => {
		const ctx = mockContext();
		const result = await projectsUpdate.execute({ projectId: PROJECT_ID }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsArchive.execute({ projectId: PROJECT_ID }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsMembers.execute({ projectId: PROJECT_ID }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsAddMember.execute({ projectId: PROJECT_ID, userId: USER_ID, role: "Member" }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsUpdateRole.execute({ projectId: PROJECT_ID, userId: USER_ID, role: "Admin" }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsRemoveMember.execute({ projectId: PROJECT_ID, userId: USER_ID }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
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

	test("is a deprecated no-op (no backend call)", async () => {
		const ctx = mockContext();
		const result = await projectsLeave.execute({ projectId: PROJECT_ID }, ctx);
		expectNoBackendCall(ctx);
		expect(result).toMatchObject({ deprecated: true });
	});
});

// ---------------------------------------------------------------------------
// registerProjectCommands — stays registered (parity + back-compat)
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

	test("all commands are marked [DEPRECATED] in their description", () => {
		const commands = registerProjectCommands();
		for (const cmd of commands) {
			expect(cmd.description).toContain("[DEPRECATED]");
		}
	});

	test("command names are unique", () => {
		const commands = registerProjectCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
