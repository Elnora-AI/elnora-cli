import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	stripeCustomerId: z.string().min(1).describe("Stripe customer ID (e.g. cus_xxx)"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsSetStripe: ElnoraCommand<Input> = {
	name: "orgs.setStripe",
	group: "orgs",
	description: "Set the Stripe customer ID for an organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		return ctx.client.put(
			"organization_stripe_customer",
			{ stripeCustomerId: input.stripeCustomerId },
			{ pathParams: { id: input.orgId } },
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
