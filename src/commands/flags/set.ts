import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { confirmDestructive } from "../_shared/confirm.js";

const inputSchema = z.object({
	key: z.string().min(1).describe("Feature flag key"),
	value: z.enum(["true", "false"]).describe("Feature flag value"),
	yes: z.boolean().optional().default(false).describe("Skip confirmation prompt"),
});

type Input = z.infer<typeof inputSchema>;

export const flagsSet: ElnoraCommand<Input> = {
	name: "flags.set",
	group: "flags",
	description: "Set a feature flag value",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		if (!input.yes) {
			const confirmed = await confirmDestructive(`Set feature flag "${input.key}" to ${input.value}? [y/N] `);
			if (!confirmed) {
				return { updated: false, key: input.key };
			}
		}
		const boolValue = input.value === "true";
		return ctx.client.put(
			"feature_flag",
			{ value: boolValue },
			{
				pathParams: { key: input.key },
			},
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
