import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { confirmDestructive } from "../_shared/confirm.js";

const inputSchema = z.object({
	versionId: z.string().describe("Legal document version ID"),
	yes: z.boolean().optional().default(false).describe("Skip confirmation prompt"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { deleted: boolean; versionId: string };

export const accountDeleteLegalDoc: ElnoraCommand<Input, Output> = {
	name: "account.deleteLegalDoc",
	group: "account",
	description: "Delete a legal document version (SystemAdmin only)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		if (!input.yes) {
			const confirmed = await confirmDestructive(
				`Are you sure you want to delete legal document version ${input.versionId}? [y/N] `,
			);
			if (!confirmed) {
				return { deleted: false, versionId: input.versionId };
			}
		}
		await ctx.client.del("legal_doc_version_id", {
			pathParams: { id: input.versionId },
		});
		return { deleted: true, versionId: input.versionId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.versionId;
		return JSON.stringify(output, null, 2);
	},
};
