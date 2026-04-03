import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID"),
	cursor: z.string().optional().describe("Pagination cursor"),
	limit: z.number().int().min(1).max(100).default(50).describe("Results per page"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksMessages: ElnoraCommand<Input> = {
	name: "tasks.messages",
	group: "tasks",
	description: "List messages for a task",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		const queryParams: Record<string, string | number> = { limit: input.limit };
		if (input.cursor) {
			queryParams.cursor = input.cursor;
		}
		return ctx.client.get("task_messages", {
			pathParams: { id: input.taskId },
			queryParams,
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
