import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	membershipId: z.string().uuid().describe("Membership ID of the member to remove"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { removed: boolean };

export const orgsRemoveMember: ElnoraCommand<Input, Output> = {
	name: "orgs.removeMember",
	group: "orgs",
	description: "Remove a member from an organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("organization_member", {
			pathParams: { id: input.orgId, mid: input.membershipId },
		});
		return { removed: true };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return String(output.removed);
		return JSON.stringify(output, null, 2);
	},
};
