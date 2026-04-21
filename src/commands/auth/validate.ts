import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { resolveApiKey } from "../../lib/profiles.js";

const inputSchema = z.object({
	token: z.string().optional().describe("Token to validate (defaults to current API key)"),
});

type Input = z.infer<typeof inputSchema>;

export const authValidate: ElnoraCommand<Input> = {
	name: "auth.validate",
	group: "auth",
	description: "Validate a JWT or API key token",
	inputSchema,
	outputSchema: z.any(),
	annotations: { exposeInMcp: false },

	async execute(input, ctx) {
		const tokenToValidate = input.token ?? resolveApiKey();
		return ctx.client.post("auth_validate", { token: tokenToValidate });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
