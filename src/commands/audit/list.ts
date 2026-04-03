import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { paginationInput } from "../_shared/pagination.js";

const inputSchema = z.object({
	org: z.string().uuid().describe("Organization ID"),
	...paginationInput,
	action: z.string().optional().describe("Filter by action type"),
	userId: z.string().optional().describe("Filter by user ID"),
});

type Input = z.infer<typeof inputSchema>;

export const auditList: ElnoraCommand<Input> = {
	name: "audit.list",
	group: "audit",
	description: "List audit log entries for an organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		const queryParams: Record<string, string | number> = {
			page: input.page,
			pageSize: input.pageSize,
		};
		if (input.action) queryParams.action = input.action;
		if (input.userId) queryParams.userId = input.userId;
		return ctx.client.get("audit_log", {
			pathParams: { orgId: input.org },
			queryParams,
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
