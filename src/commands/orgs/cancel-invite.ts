import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	invitationId: z.string().uuid().describe("Invitation ID to cancel"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { cancelled: boolean; invitationId: string };

export const orgsCancelInvite: ElnoraCommand<Input, Output> = {
	name: "orgs.cancelInvite",
	group: "orgs",
	description: "Cancel a pending organization invitation",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("org_invitation", {
			pathParams: { orgId: input.orgId, invId: input.invitationId },
		});
		return { cancelled: true, invitationId: input.invitationId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.invitationId;
		return JSON.stringify(output, null, 2);
	},
};
