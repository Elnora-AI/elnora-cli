import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	folderId: z.string().uuid().describe("Folder ID"),
	aceId: z.string().uuid().describe("Share (ACE) ID to revoke"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersUnshare: ElnoraCommand<Input> = {
	name: "folders.unshare",
	group: "folders",
	description: "Revoke a folder share by its ACE id",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true, idempotentHint: true },

	async execute(input, ctx) {
		await ctx.client.del("folder_share_ace", {
			pathParams: { id: input.folderId, aceId: input.aceId },
		});
		return { revoked: true, folderId: input.folderId, aceId: input.aceId };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { aceId?: string }).aceId ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
