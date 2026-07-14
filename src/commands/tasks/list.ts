import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	project: z.string().uuid().optional().describe("Project ID to filter by"),
	status: z
		.enum(["active", "archived", "all"])
		.optional()
		.describe("Lifecycle filter: active (default), archived, or all"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const tasksList: ElnoraCommand<Input> = {
	name: "tasks.list",
	group: "tasks",
	description: "List tasks, optionally filtered by project or lifecycle status",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		const queryParams: Record<string, string | number> = { page: input.page, pageSize: input.pageSize };
		if (input.status) queryParams.status = input.status;
		if (input.project) {
			return ctx.client.get("project_tasks", { pathParams: { id: input.project }, queryParams });
		}
		return ctx.client.get("tasks", { queryParams });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
