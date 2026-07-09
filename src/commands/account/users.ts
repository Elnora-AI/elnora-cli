import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	state: z.enum(["Active", "Pending", "Deleted"]).optional().describe("Filter by user state"),
	refCode: z.string().optional().describe("Filter by referral code"),
});

type Input = z.infer<typeof inputSchema>;

export const accountUsers: ElnoraCommand<Input> = {
	name: "account.users",
	group: "account",
	description: "List all users (admin)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true, internal: true },

	async execute(input, ctx) {
		const queryParams: Record<string, string | number> = {};
		if (input.state) queryParams.state = input.state;
		if (input.refCode) queryParams.refCode = input.refCode;
		return ctx.client.get("account_users", {
			queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
