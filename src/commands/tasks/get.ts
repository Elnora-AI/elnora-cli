import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksGet: ElnoraCommand<Input> = {
	name: "tasks.get",
	group: "tasks",
	description: "Get details of a specific task",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("task", {
			pathParams: { id: input.taskId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
