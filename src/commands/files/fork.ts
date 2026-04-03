import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID to fork"),
	targetProject: z.string().uuid().describe("Target project ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesFork: ElnoraCommand<Input> = {
	name: "files.fork",
	group: "files",
	description: "Fork a file to another project",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("file_fork", { targetProjectId: input.targetProject }, {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
