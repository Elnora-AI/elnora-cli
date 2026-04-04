import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsGet: ElnoraCommand<Input> = {
	name: "orgs.get",
	group: "orgs",
	description: "Get details of a specific organization",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.get("organization", {
			pathParams: { id: input.orgId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
