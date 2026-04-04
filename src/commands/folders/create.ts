import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
	name: z.string().min(1).describe("Folder name"),
	parentId: z.string().uuid().optional().describe("Parent folder ID"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersCreate: ElnoraCommand<Input> = {
	name: "folders.create",
	group: "folders",
	description: "Create a new folder in a project",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const body: Record<string, unknown> = { name: input.name };
		if (input.parentId) body.parentId = input.parentId;
		return ctx.client.post("project_folders", body, {
			pathParams: { id: input.projectId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
