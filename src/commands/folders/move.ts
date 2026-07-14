import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID to move"),
	parentId: z.string().min(1).describe("Target parent folder ID, or 'root' to move to the top level"),
	legacy: z.boolean().default(false).describe("Move a legacy project folder instead of a Knowledge Base folder"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersMove: ElnoraCommand<Input> = {
	name: "folders.move",
	group: "folders",
	description: "Move a folder to a new parent (or to root)",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const isRoot = input.parentId === "root";
		if (!isRoot && !UUID_RE.test(input.parentId)) {
			throw new ValidationError(
				"parent must be a valid UUID or 'root'.",
				"Provide a folder UUID or the literal string 'root'.",
			);
		}
		const opts = { pathParams: { id: input.folderId } };

		if (input.legacy) {
			// Deprecated project-folder controller: PUT /folders/{id}/move with MoveFolderDTO.
			return ctx.client.put("folder_move", { newParentFolderId: isRoot ? null : input.parentId }, opts);
		}
		// KB: the dedicated move endpoint can't clear a parent — move-to-root goes through PATCH /folders/{id}.
		if (isRoot) {
			return ctx.client.patch("folder", { moveToRoot: true }, opts);
		}
		return ctx.client.patch("folder_move", { parentFolderId: input.parentId }, opts);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
