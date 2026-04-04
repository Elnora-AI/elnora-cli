import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID to commit"),
});

type Input = z.infer<typeof inputSchema>;

export const filesCommit: ElnoraCommand<Input> = {
	name: "files.commit",
	group: "files",
	description: "Commit a file's working copy",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("file_commit", undefined, {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
