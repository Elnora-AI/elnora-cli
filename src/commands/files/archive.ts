import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID to archive"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { archived: boolean; fileId: string };

export const filesArchive: ElnoraCommand<Input, Output> = {
	name: "files.archive",
	group: "files",
	description: "Archive (delete) a file",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("file", {
			pathParams: { id: input.fileId },
		});
		return { archived: true, fileId: input.fileId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.fileId;
		return JSON.stringify(output, null, 2);
	},
};
