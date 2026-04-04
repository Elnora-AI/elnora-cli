import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	project: z.string().uuid().optional().describe("Project ID to filter by"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const tasksList: ElnoraCommand<Input> = {
	name: "tasks.list",
	group: "tasks",
	description: "List tasks, optionally filtered by project",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		if (input.project) {
			return ctx.client.get("project_tasks", {
				pathParams: { id: input.project },
				queryParams: { page: input.page, pageSize: input.pageSize },
			});
		}
		return ctx.client.get("tasks", {
			queryParams: { page: input.page, pageSize: input.pageSize },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
