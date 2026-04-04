import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { confirmDestructive } from "../_shared/confirm.js";

const inputSchema = z.object({
	yes: z.boolean().optional().default(false).describe("Skip confirmation prompt"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { deleted: boolean };

export const accountDelete: ElnoraCommand<Input, Output> = {
	name: "account.delete",
	group: "account",
	description: "Delete your own account",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		if (!input.yes) {
			const confirmed = await confirmDestructive("Type DELETE to confirm account deletion: ", "DELETE");
			if (!confirmed) {
				return { deleted: false };
			}
		}
		await ctx.client.del("account_delete");
		return { deleted: true };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return String(output.deleted);
		return JSON.stringify(output, null, 2);
	},
};
