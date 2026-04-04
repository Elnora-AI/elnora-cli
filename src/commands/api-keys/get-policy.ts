import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({});

type Input = z.infer<typeof inputSchema>;

export const apiKeysGetPolicy: ElnoraCommand<Input> = {
	name: "api-keys.getPolicy",
	group: "api-keys",
	description: "Get the API key creation policy",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(_input, ctx) {
		return ctx.client.get("api_key_policy");
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
