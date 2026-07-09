import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const foldersFiles: ElnoraCommand<Input> = {
	name: "folders.files",
	group: "folders",
	description: "List files placed directly in a Knowledge Base folder",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("folder_files", {
			pathParams: { id: input.folderId },
			queryParams: { page: input.page, pageSize: input.pageSize },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
