import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID to download"),
});

type Input = z.infer<typeof inputSchema>;

export const filesDownload: ElnoraCommand<Input> = {
	name: "files.download",
	group: "files",
	description: "Download a file",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("file_download", {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (typeof output === "string") return output;
		return JSON.stringify(output, null, 2);
	},
};
