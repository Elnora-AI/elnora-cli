import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	project: z.string().uuid().describe("Project ID"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const filesList: ElnoraCommand<Input> = {
	name: "files.list",
	group: "files",
	description: "List files in a project",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("project_files", {
			pathParams: { id: input.project },
			queryParams: { page: input.page, pageSize: input.pageSize },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
