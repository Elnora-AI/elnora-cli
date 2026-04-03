import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID to move"),
	parentId: z.string().min(1).describe("Target parent folder ID, or 'root' to move to project root"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersMove: ElnoraCommand<Input> = {
	name: "folders.move",
	group: "folders",
	description: "Move a folder to a new parent (or to root)",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		let parentValue: string | null;
		if (input.parentId === "root") {
			parentValue = null;
		} else if (UUID_RE.test(input.parentId)) {
			parentValue = input.parentId;
		} else {
			throw new ValidationError(
				"parent must be a valid UUID or 'root'.",
				"Provide a folder UUID or the literal string 'root'.",
			);
		}
		return ctx.client.put("folder_move", { parentId: parentValue }, {
			pathParams: { id: input.folderId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
