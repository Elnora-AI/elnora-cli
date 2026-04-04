import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	query: z.string().min(1).describe("Search query"),
	project: z.string().uuid().optional().describe("Project ID to scope search"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const filesSearchContent: ElnoraCommand<Input> = {
	name: "files.searchContent",
	group: "files",
	description: "Search file content across projects",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		const queryParams: Record<string, string | number> = {
			q: input.query,
			page: input.page,
			pageSize: input.pageSize,
		};
		if (input.project) queryParams.projectId = input.project;
		return ctx.client.get("search_file_content", { queryParams });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
