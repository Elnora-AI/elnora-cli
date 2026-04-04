import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	org: z.string().uuid().describe("Organization ID"),
	name: z.string().min(1).describe("Folder name"),
	parent: z.string().uuid().optional().describe("Parent folder ID"),
});

type Input = z.infer<typeof inputSchema>;

export const libraryCreateFolder: ElnoraCommand<Input> = {
	name: "library.createFolder",
	group: "library",
	description: "Create a folder in the organization library",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const body: Record<string, string> = { name: input.name };
		if (input.parent) body.parentId = input.parent;
		return ctx.client.post("library_folders", body, {
			pathParams: { orgId: input.org },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
