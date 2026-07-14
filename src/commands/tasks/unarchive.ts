import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID to unarchive"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksUnarchive: ElnoraCommand<Input> = {
	name: "tasks.unarchive",
	group: "tasks",
	description: "Unarchive a task so it reappears in the default task list",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		await ctx.client.post("task_unarchive", {}, { pathParams: { id: input.taskId } });
		return { unarchived: true, taskId: input.taskId };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { taskId?: string }).taskId ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
