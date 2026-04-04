import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	name: z.string().min(1).optional().describe("New file name"),
	folder: z.string().uuid().optional().describe("New folder ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesUpdate: ElnoraCommand<Input> = {
	name: "files.update",
	group: "files",
	description: "Update a file's metadata",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		const { fileId, ...fields } = input;
		if (!fields.name && !fields.folder) {
			throw new ValidationError(
				"At least one field (name, folder) must be provided.",
				"Provide at least one field to update.",
			);
		}
		const body: Record<string, unknown> = {};
		if (fields.name) body.name = fields.name;
		if (fields.folder) body.folderId = fields.folder;
		return ctx.client.patch("file", body, {
			pathParams: { id: fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
