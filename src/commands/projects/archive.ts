import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID to archive"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { archived: boolean; projectId: string };

export const projectsArchive: ElnoraCommand<Input, Output> = {
	name: "projects.archive",
	group: "projects",
	description: "Archive (delete) a project",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("project", {
			pathParams: { id: input.projectId },
		});
		return { archived: true, projectId: input.projectId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.projectId;
		return JSON.stringify(output, null, 2);
	},
};
