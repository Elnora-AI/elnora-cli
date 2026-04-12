import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	email: z.string().email().describe("Email address to invite"),
	role: z.string().optional().default("Member").describe("Role to assign (default: Member)"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsInvite: ElnoraCommand<Input> = {
	name: "orgs.invite",
	group: "orgs",
	description: "Invite a user to an organization by email",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		// Smart upsert: the backend list endpoint now returns both pending and
		// expired invitations. If we find an existing row for this email, route to
		// the resend endpoint instead of POST so:
		//   - Pending rows get their expiry extended and a fresh email sent.
		//   - Expired rows are recycled on the server, preserving the invitation ID.
		// Only when no row exists do we create a new invitation.
		const existing = await ctx.client.get("org_invitations", {
			pathParams: { orgId: input.orgId },
		});
		const items = Array.isArray(existing)
			? existing
			: (((existing as Record<string, unknown>)?.items as unknown[]) ?? []);
		const match = items.find((inv: unknown) => {
			const i = inv as Record<string, string>;
			return i.email?.toLowerCase() === input.email.toLowerCase();
		});

		if (match) {
			const matchId = (match as Record<string, string>).id;
			return ctx.client.post("org_invitation_resend", {}, { pathParams: { orgId: input.orgId, invId: matchId } });
		}

		// No existing row - create a fresh invitation.
		return ctx.client.post(
			"org_invitations",
			{ email: input.email, role: input.role ?? "Member" },
			{ pathParams: { orgId: input.orgId } },
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
