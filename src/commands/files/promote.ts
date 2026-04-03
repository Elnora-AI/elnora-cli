import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	visibility: z.string().min(1).describe("Visibility level"),
});

type Input = z.infer<typeof inputSchema>;

export const filesPromote: ElnoraCommand<Input> = {
	name: "files.promote",
	group: "files",
	description: "Promote a file to a new visibility level",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("file_promote", { visibility: input.visibility }, {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
