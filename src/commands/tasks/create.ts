import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	project: z.string().uuid().describe("Project ID"),
	title: z.string().optional().describe("Task title"),
	message: z.string().optional().describe("Initial message"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksCreate: ElnoraCommand<Input> = {
	name: "tasks.create",
	group: "tasks",
	description: "Create a new task in a project",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("tasks", {
			projectId: input.project,
			title: input.title,
			initialMessage: input.message,
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
