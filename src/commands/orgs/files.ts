import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const orgsFiles: ElnoraCommand<Input> = {
	name: "orgs.files",
	group: "orgs",
	description: "List files belonging to an organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("org_files", {
			pathParams: { orgId: input.orgId },
			queryParams: { page: input.page, pageSize: input.pageSize },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
