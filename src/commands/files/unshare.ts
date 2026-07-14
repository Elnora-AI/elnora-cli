import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	aceId: z.string().uuid().describe("Share (ACE) ID to revoke"),
});

type Input = z.infer<typeof inputSchema>;

export const filesUnshare: ElnoraCommand<Input> = {
	name: "files.unshare",
	group: "files",
	description: "Revoke a file share by its ACE id",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true, idempotentHint: true },

	async execute(input, ctx) {
		await ctx.client.del("file_share_ace", {
			pathParams: { id: input.fileId, aceId: input.aceId },
		});
		return { revoked: true, fileId: input.fileId, aceId: input.aceId };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { aceId?: string }).aceId ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
