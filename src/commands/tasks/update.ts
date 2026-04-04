import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID"),
	title: z.string().min(1).optional().describe("New task title"),
	status: z.string().optional().describe("New task status"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksUpdate: ElnoraCommand<Input> = {
	name: "tasks.update",
	group: "tasks",
	description: "Update an existing task",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		const { taskId, ...fields } = input;
		if (!fields.title && !fields.status) {
			throw new ValidationError(
				"At least one field (title, status) must be provided.",
				"Provide at least one field to update.",
			);
		}
		return ctx.client.patch("task", fields, {
			pathParams: { id: taskId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
