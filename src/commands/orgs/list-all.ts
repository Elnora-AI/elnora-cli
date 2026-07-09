import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({});

type Input = z.infer<typeof inputSchema>;

export const orgsListAll: ElnoraCommand<Input> = {
	name: "orgs.listAll",
	group: "orgs",
	description: "List all organizations (admin)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true, internal: true },

	async execute(_input, ctx) {
		return ctx.client.get("organizations_all");
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
