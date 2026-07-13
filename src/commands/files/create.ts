import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	project: z.string().uuid().optional().describe("Project ID (optional; defaults to your workspace)"),
	name: z.string().min(1).describe("File name"),
	type: z.string().min(1).describe("File type"),
	folder: z.string().uuid().optional().describe("Folder ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesCreate: ElnoraCommand<Input> = {
	name: "files.create",
	group: "files",
	description: "Create a new file",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("files", {
			// projectId optional (ELN-880 Phase C): omitted → backend uses the caller's default workspace.
			...(input.project ? { projectId: input.project } : {}),
			name: input.name,
			// Backend CreateFileDTO expects `fileType` (the CLI flag is --type). Previously sent as
			// `type`, which the API ignored → "FileType field is required" 400.
			fileType: input.type,
			folderId: input.folder,
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
