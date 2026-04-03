import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	task: z.string().uuid().optional().describe("Task ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesWorkingCopy: ElnoraCommand<Input> = {
	name: "files.workingCopy",
	group: "files",
	description: "Create a working copy of a file",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const body: Record<string, unknown> = {};
		if (input.task !== undefined) body.taskId = input.task;
		return ctx.client.post("file_working_copy", body, {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
