import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesGet: ElnoraCommand<Input> = {
	name: "files.get",
	group: "files",
	description: "Get details of a specific file",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("file", {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
