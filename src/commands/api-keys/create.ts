import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	name: z.string().min(1).describe("API key name"),
	scopes: z.string().optional().describe("Comma-separated list of scopes"),
});

type Input = z.infer<typeof inputSchema>;

export const keysCreate: ElnoraCommand<Input> = {
	name: "api-keys.create",
	group: "api-keys",
	description: "Create a new API key",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const parsedScopes = input.scopes
			? input.scopes
					.split(",")
					.map((s) => s.trim())
					.filter((s) => s.length > 0)
			: undefined;
		return ctx.client.post("api_keys", { name: input.name, scopes: parsedScopes });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
