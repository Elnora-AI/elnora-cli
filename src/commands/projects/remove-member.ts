import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
	userId: z.string().uuid().describe("User ID to remove"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { removed: boolean };

export const projectsRemoveMember: ElnoraCommand<Input, Output> = {
	name: "projects.removeMember",
	group: "projects",
	description: "Remove a member from a project",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("project_member", {
			pathParams: { id: input.projectId, uid: input.userId },
		});
		return { removed: true };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return String(output.removed);
		return JSON.stringify(output, null, 2);
	},
};
