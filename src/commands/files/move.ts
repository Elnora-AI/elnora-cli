import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID to move"),
	parentFolderId: z.string().uuid().describe("Destination Knowledge Base folder ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesMove: ElnoraCommand<Input> = {
	name: "files.move",
	group: "files",
	description: "Move a file to a different Knowledge Base folder",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		return ctx.client.patch(
			"file_move",
			{ parentFolderId: input.parentFolderId },
			{ pathParams: { id: input.fileId } },
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
