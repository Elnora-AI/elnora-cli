import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID"),
	name: z.string().min(1).describe("New folder name"),
	legacy: z.boolean().default(false).describe("Rename a legacy project folder instead of a Knowledge Base folder"),
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
		const body = { name: input.name };
		const opts = { pathParams: { id: input.folderId } };
		// KB folders use PATCH /folders/{id}; the deprecated project-folder controller uses PUT.
		return input.legacy ? ctx.client.put("folder", body, opts) : ctx.client.patch("folder", body, opts);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
