import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	query: z.string().min(1).describe("Search query"),
	projectId: z.string().uuid().optional().describe("Filter by project ID"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const searchFileContent: ElnoraCommand<Input> = {
	name: "search.fileContent",
	group: "search",
	description: "Search within file contents",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		const queryParams: Record<string, string | number> = {
			q: input.query,
			page: input.page,
			pageSize: input.pageSize,
		};
		if (input.projectId) queryParams.project = input.projectId;
		return ctx.client.get("search_file_content", { queryParams });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
