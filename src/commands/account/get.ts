import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	userId: z.string().describe("User ID"),
});

type Input = z.infer<typeof inputSchema>;

export const accountGet: ElnoraCommand<Input> = {
	name: "account.get",
	group: "account",
	description: "Get account details for a user",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("account_user", {
			pathParams: { id: input.userId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
