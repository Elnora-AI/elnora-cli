import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID to archive"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { archived: boolean; taskId: string };

export const tasksArchive: ElnoraCommand<Input, Output> = {
	name: "tasks.archive",
	group: "tasks",
	description: "Archive (delete) a task",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("task", {
			pathParams: { id: input.taskId },
		});
		return { archived: true, taskId: input.taskId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.taskId;
		return JSON.stringify(output, null, 2);
	},
};
