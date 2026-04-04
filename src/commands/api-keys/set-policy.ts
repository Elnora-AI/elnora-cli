import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	policy: z.enum(["all_members", "admins_only"]).describe("API key creation policy"),
});

type Input = z.infer<typeof inputSchema>;

export const apiKeysSetPolicy: ElnoraCommand<Input> = {
	name: "api-keys.setPolicy",
	group: "api-keys",
	description: "Set the API key creation policy",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.put("api_key_policy", { policy: input.policy });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
