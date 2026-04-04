import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsMembers: ElnoraCommand<Input> = {
	name: "orgs.members",
	group: "orgs",
	description: "List members of an organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("organization_members", {
			pathParams: { id: input.orgId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
