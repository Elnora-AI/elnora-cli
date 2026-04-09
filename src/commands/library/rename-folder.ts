import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	folderId: z.string().uuid().describe("Folder ID to rename"),
	name: z.string().min(1).describe("New folder name"),
});

type Input = z.infer<typeof inputSchema>;

export const libraryRenameFolder: ElnoraCommand<Input> = {
	name: "library.renameFolder",
	group: "library",
	description: "Rename a folder in the organization library",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.put(
			"library_folder",
			{ name: input.name },
			{
				pathParams: { orgId: input.orgId, id: input.folderId },
			},
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
