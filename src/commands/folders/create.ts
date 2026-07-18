import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { projectsRemoved } from "../_shared/deprecated.js";

const inputSchema = z.object({
	name: z.string().min(1).describe("Folder name"),
	parentId: z.string().uuid().optional().describe("Parent folder ID (for nesting)"),
	project: z
		.string()
		.uuid()
		.optional()
		.describe("[DEPRECATED] Legacy project-scoped folders were removed; this option is a no-op."),
});

type Input = z.infer<typeof inputSchema>;

export const foldersCreate: ElnoraCommand<Input> = {
	name: "folders.create",
	group: "folders",
	description:
		"Create a Knowledge Base folder. (The legacy project-scoped path via `project` is deprecated and no longer supported.)",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		if (input.project) {
			// Legacy project-scoped folders were removed (ELN-880/881). No-op instead of
			// calling the retired /projects/{id}/folders route.
			return projectsRemoved({
				hint: "Project-scoped folders were removed. Omit --project to create a Knowledge Base folder.",
			});
		}
		const body: Record<string, unknown> = { name: input.name };
		if (input.parentId) body.parentFolderId = input.parentId;
		return ctx.client.post("folder_create", body);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
