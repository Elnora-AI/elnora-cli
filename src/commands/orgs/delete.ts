import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { confirmDestructive } from "../_shared/confirm.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID to delete"),
	yes: z.boolean().optional().default(false).describe("Skip confirmation prompt"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { deleted: boolean; orgId: string };

export const orgsDelete: ElnoraCommand<Input, Output> = {
	name: "orgs.delete",
	group: "orgs",
	description: "Delete an organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		if (!input.yes) {
			const confirmed = await confirmDestructive(`Are you sure you want to delete organization ${input.orgId}? [y/N] `);
			if (!confirmed) {
				return { deleted: false, orgId: input.orgId };
			}
		}
		await ctx.client.del("organization", {
			pathParams: { id: input.orgId },
		});
		return { deleted: true, orgId: input.orgId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.orgId;
		return JSON.stringify(output, null, 2);
	},
};
