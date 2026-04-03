import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	org: z.string().uuid().describe("Organization ID"),
	folderId: z.string().uuid().describe("Folder ID to delete"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { deleted: boolean; folderId: string };

export const libraryDeleteFolder: ElnoraCommand<Input, Output> = {
	name: "library.deleteFolder",
	group: "library",
	description: "Delete a folder from the organization library",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("library_folder", {
			pathParams: { orgId: input.org, id: input.folderId },
		});
		return { deleted: true, folderId: input.folderId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.folderId;
		return JSON.stringify(output, null, 2);
	},
};
