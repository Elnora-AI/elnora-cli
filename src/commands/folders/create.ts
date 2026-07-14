import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	name: z.string().min(1).describe("Folder name"),
	parentId: z.string().uuid().optional().describe("Parent folder ID (for nesting)"),
	project: z
		.string()
		.uuid()
		.optional()
		.describe("Legacy: create a project-scoped folder in this project instead of a Knowledge Base folder"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersCreate: ElnoraCommand<Input> = {
	name: "folders.create",
	group: "folders",
	description: "Create a Knowledge Base folder (or a legacy project folder when project is set)",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		// Both the KB (CreateFolderRequestDTO) and legacy (CreateFolderDTO) bodies use `parentFolderId`.
		const body: Record<string, unknown> = { name: input.name };
		if (input.parentId) body.parentFolderId = input.parentId;
		if (input.project) {
			// Legacy escape hatch: materialized-path, project-scoped folder.
			return ctx.client.post("project_folders", body, { pathParams: { id: input.project } });
		}
		return ctx.client.post("folder_create", body);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
