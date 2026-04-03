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
		// Check for existing pending invitation with same email (idempotent)
		const existing = await ctx.client.get("org_invitations", {
			pathParams: { orgId: input.orgId },
		});
		const items = Array.isArray(existing) ? existing : ((existing as any)?.items ?? []);
		const match = items.find(
			(inv: any) => inv.email?.toLowerCase() === input.email.toLowerCase() && inv.status === "Pending",
		);
		if (match) return match;

		// Create new invitation
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
