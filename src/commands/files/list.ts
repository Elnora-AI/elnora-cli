import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	project: z.string().uuid().optional().describe("Project ID (optional; defaults to your workspace)"),
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
		// projectId optional (ELN-880 Phase C): with a project we keep the legacy project-scoped
		// listing; without one we list every file accessible in the caller's workspace. GET
		// /folders/files is a flat, org-wide list (capped at 200) and takes no pagination.
		if (input.project) {
			return ctx.client.get("project_files", {
				pathParams: { id: input.project },
				queryParams: { page: input.page, pageSize: input.pageSize },
			});
		}
		return ctx.client.get("folders_files");
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
