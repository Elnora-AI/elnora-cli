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
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const filesList: ElnoraCommand<Input> = {
	name: "files.list",
	group: "files",
	description: "List files in your workspace. (The legacy `project` filter is deprecated and no longer supported.)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		if (input.project) {
			// Legacy project-scoped file listing was removed (ELN-880/881). No-op instead of
			// calling the retired /projects/{id}/files route, which now 404s.
			return projectsRemoved({
				hint: "Project-scoped file listing was removed. Omit --project to list every file in your workspace.",
			});
		}
		// GET /folders/files is a flat, org-wide list (capped at 200) and takes no pagination.
		return ctx.client.get("folders_files");
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
