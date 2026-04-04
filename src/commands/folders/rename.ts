import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID"),
	name: z.string().min(1).describe("New folder name"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersRename: ElnoraCommand<Input> = {
	name: "folders.rename",
	group: "folders",
	description: "Rename a folder",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		return ctx.client.put(
			"folder",
			{ name: input.name },
			{
				pathParams: { id: input.folderId },
			},
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
