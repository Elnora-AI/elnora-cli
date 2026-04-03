import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesContent: ElnoraCommand<Input> = {
	name: "files.content",
	group: "files",
	description: "Get the raw content of a file",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("file_content", {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, _format: OutputFormat): string {
		if (typeof output === "string") return output;
		return JSON.stringify(output, null, 2);
	},
};
