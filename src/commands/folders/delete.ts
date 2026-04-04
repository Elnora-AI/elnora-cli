import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID to delete"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { deleted: boolean; folderId: string };

export const foldersDelete: ElnoraCommand<Input, Output> = {
	name: "folders.delete",
	group: "folders",
	description: "Delete a folder",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("folder", {
			pathParams: { id: input.folderId },
		});
		return { deleted: true, folderId: input.folderId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.folderId;
		return JSON.stringify(output, null, 2);
	},
};
