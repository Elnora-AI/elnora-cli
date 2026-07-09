import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersChildren: ElnoraCommand<Input> = {
	name: "folders.children",
	group: "folders",
	description: "List the child folders of a Knowledge Base folder",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("folder_children", {
			pathParams: { id: input.folderId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
