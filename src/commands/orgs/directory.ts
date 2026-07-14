import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	query: z.string().min(2).describe("Name or email substring to match (minimum 2 characters)"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsDirectory: ElnoraCommand<Input> = {
	name: "orgs.directory",
	group: "orgs",
	description: "Search organization members by name or email (Share-modal typeahead)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("org_member_directory", {
			pathParams: { orgId: input.orgId },
			queryParams: { q: input.query },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
