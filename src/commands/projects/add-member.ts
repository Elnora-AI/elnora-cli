import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { projectsRemoved } from "../_shared/deprecated.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
	userId: z.string().uuid().describe("User ID to add"),
	role: z.string().default("Member").describe("Role to assign (default: Member)"),
});

type Input = z.infer<typeof inputSchema>;

export const projectsAddMember: ElnoraCommand<Input> = {
	name: "projects.addMember",
	group: "projects",
	description: "[DEPRECATED] Add a member to a project — projects were removed; this is a no-op.",
	inputSchema,
	outputSchema: z.any(),

	async execute() {
		return projectsRemoved();
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
