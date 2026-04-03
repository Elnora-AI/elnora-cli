import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	keyId: z.string().uuid().describe("API key ID to revoke"),
});

type Input = z.infer<typeof inputSchema>;
type Output = { revoked: boolean; keyId: string };

export const apiKeysRevoke: ElnoraCommand<Input, Output> = {
	name: "api-keys.revoke",
	group: "api-keys",
	description: "Revoke an API key",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, ctx) {
		await ctx.client.del("api_key", {
			pathParams: { id: input.keyId },
		});
		return { revoked: true, keyId: input.keyId };
	},

	formatOutput(output: Output, format: OutputFormat): string {
		if (format === "compact") return output.keyId;
		return JSON.stringify(output, null, 2);
	},
};
