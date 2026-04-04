import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID to set as default"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsSetDefault: ElnoraCommand<Input> = {
	name: "orgs.setDefault",
	group: "orgs",
	description: "Set an organization as the default",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		return ctx.client.put("organization_set_default", undefined, {
			pathParams: { id: input.orgId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
