import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	query: z.string().min(1).describe("Search query"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const searchTasks: ElnoraCommand<Input> = {
	name: "search.tasks",
	group: "search",
	description: "Search tasks by query",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("search_tasks", {
			queryParams: { q: input.query, page: input.page, pageSize: input.pageSize },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
