import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	name: z.string().min(1).describe("Organization name"),
	description: z.string().optional().describe("Organization description"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsCreate: ElnoraCommand<Input> = {
	name: "orgs.create",
	group: "orgs",
	description: "Create a new organization",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("organizations", input);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
