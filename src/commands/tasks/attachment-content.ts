import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID"),
	attachmentId: z.string().uuid().describe("Attachment ID"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksAttachmentContent: ElnoraCommand<Input> = {
	name: "tasks.attachmentContent",
	group: "tasks",
	description: "Get the content of a task attachment",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("task_attachment_content", {
			pathParams: { id: input.taskId, aid: input.attachmentId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { content?: string }).content ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
