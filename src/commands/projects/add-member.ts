import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
	userId: z.string().uuid().describe("User ID to add"),
	role: z.string().default("Member").describe("Role to assign (default: Member)"),
});

type Input = z.infer<typeof inputSchema>;

export const projectsAddMember: ElnoraCommand<Input> = {
	name: "projects.addMember",
	group: "projects",
	description: "Add a member to a project",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post(
			"project_members",
			{ userId: input.userId, role: input.role },
			{ pathParams: { id: input.projectId } },
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
