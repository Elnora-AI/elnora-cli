import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({});

type Input = z.infer<typeof inputSchema>;

export const authStatus: ElnoraCommand<Input> = {
	name: "auth.status",
	group: "auth",
	description: "Verify API key and show connection info",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(_input, ctx) {
		const result = await ctx.client.get<unknown>("projects", {
			queryParams: { page: 1, pageSize: 1 },
		});
		const projectCount =
			(result as { totalCount?: number }).totalCount ??
			(result as { items?: unknown[] }).items?.length ??
			0;
		return { profile: ctx.profileName, authenticated: true, projectCount };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return String((output as { authenticated?: boolean }).authenticated ?? "");
		return JSON.stringify(output, null, 2);
	},
};
