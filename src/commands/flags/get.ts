import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	key: z.string().min(1).describe("Feature flag key"),
});

type Input = z.infer<typeof inputSchema>;

export const flagsGet: ElnoraCommand<Input> = {
	name: "flags.get",
	group: "flags",
	description: "Get a feature flag by key",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("feature_flag", {
			pathParams: { key: input.key },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
