import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { projectsRemoved } from "../_shared/deprecated.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	project: z
		.string()
		.uuid()
		.optional()
		.describe("[DEPRECATED] Legacy project filter; projects were removed and this option is a no-op."),
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
	description:
		"List tasks, optionally filtered by lifecycle status. (The legacy `project` filter is deprecated and no longer supported.)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		if (input.project) {
			// Legacy project-scoped task listing was removed (ELN-880/881). No-op instead of
			// calling the retired /projects/{id}/tasks route, which now 404s.
			return projectsRemoved({
				hint: "Project-scoped task listing was removed. Omit --project to list every task in your workspace.",
			});
		}
		const queryParams: Record<string, string | number> = { page: input.page, pageSize: input.pageSize };
		if (input.status) queryParams.status = input.status;
		return ctx.client.get("tasks", { queryParams });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
