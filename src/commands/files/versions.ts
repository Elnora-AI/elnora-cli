import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const filesVersions: ElnoraCommand<Input> = {
	name: "files.versions",
	group: "files",
	description: "List versions of a file",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("file_versions", {
			pathParams: { id: input.fileId },
			queryParams: { page: input.page, pageSize: input.pageSize },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
