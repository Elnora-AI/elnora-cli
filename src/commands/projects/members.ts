import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
});

type Input = z.infer<typeof inputSchema>;

export const projectsMembers: ElnoraCommand<Input> = {
	name: "projects.members",
	group: "projects",
	description: "List members of a project",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("project_members", {
			pathParams: { id: input.projectId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
