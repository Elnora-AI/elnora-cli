import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksAttachments: ElnoraCommand<Input> = {
	name: "tasks.attachments",
	group: "tasks",
	description: "List the files attached to a task",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("task_attachments", { pathParams: { id: input.taskId } });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
