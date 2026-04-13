import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	invitationId: z.string().uuid().describe("Invitation ID to resend"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsResendInvite: ElnoraCommand<Input> = {
	name: "orgs.resendInvite",
	group: "orgs",
	description:
		"Resend an organization invitation email. Regenerates the token and extends the expiry by 7 days. Works on both pending and expired invitations, preserves the invitation ID.",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		return ctx.client.post(
			"org_invitation_resend",
			{},
			{ pathParams: { orgId: input.orgId, invId: input.invitationId } },
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
