import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	...paginationInput,
});

type Input = z.infer<typeof inputSchema>;

export const libraryFiles: ElnoraCommand<Input> = {
	name: "library.files",
	group: "library",
	description: "List files in the organization library",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("library_files", {
			pathParams: { orgId: input.orgId },
			queryParams: { page: input.page, pageSize: input.pageSize },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
