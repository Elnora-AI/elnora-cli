import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID to delete"),
	legacy: z
		.boolean()
		.default(false)
		.describe("Hard-delete a legacy project folder instead of archiving a Knowledge Base folder"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { deleted?: boolean; archived?: boolean; folderId: string };

export const foldersDelete: ElnoraCommand<Input, Output> = {
	name: "folders.delete",
	group: "folders",
	description: "Delete a folder (Knowledge Base folders are archived)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		const opts = { pathParams: { id: input.folderId } };
		if (input.legacy) {
			await ctx.client.del("folder", opts);
			return { deleted: true, folderId: input.folderId };
		}
		// KB folders are removed by archiving, not hard-deleted.
		await ctx.client.post("folder_archive", {}, opts);
		return { archived: true, folderId: input.folderId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.folderId;
		return JSON.stringify(output, null, 2);
	},
};
