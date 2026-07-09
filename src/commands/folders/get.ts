import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersGet: ElnoraCommand<Input> = {
	name: "folders.get",
	group: "folders",
	description: "Get a Knowledge Base folder's details and breadcrumb path",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("folder", {
			pathParams: { id: input.folderId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
