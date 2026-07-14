import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	enabled: z.boolean().default(false).describe("Enable Knowledge Base auto-tidy (omit to disable)"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsSetAutotidy: ElnoraCommand<Input> = {
	name: "orgs.setAutotidy",
	group: "orgs",
	description: "Enable or disable Knowledge Base auto-tidy for an organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		return ctx.client.patch("org_kb_autotidy", { enabled: input.enabled }, { pathParams: { orgId: input.orgId } });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
