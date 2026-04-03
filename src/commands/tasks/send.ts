import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID"),
	message: z.string().min(1).describe("Message content"),
	fileRefs: z.string().optional().describe("Comma-separated file reference UUIDs"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksSend: ElnoraCommand<Input> = {
	name: "tasks.send",
	group: "tasks",
	description: "Send a message to a task",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		let referencedFileIds: string[] | undefined;
		if (input.fileRefs) {
			referencedFileIds = input.fileRefs
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
				.filter((s) => UUID_RE.test(s));
		}
		return ctx.client.post(
			"task_messages",
			{
				content: input.message,
				referencedFileIds,
			},
			{
				pathParams: { id: input.taskId },
			},
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
