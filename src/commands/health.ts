import { z } from "zod";
import type { ElnoraCommand } from "../core/command.js";

const healthInput = z.object({});

const healthOutput = z.object({
	status: z.string(),
	timestamp: z.string(),
});

export const healthCheck: ElnoraCommand<z.infer<typeof healthInput>, z.infer<typeof healthOutput>> = {
	name: "health.check",
	group: "health",
	description: "Check Elnora API health status",
	inputSchema: healthInput,
	outputSchema: healthOutput,
	annotations: { readOnlyHint: true },

	async execute(_input, ctx) {
		const result = await ctx.client.get<{ status?: string }>("/health");
		return {
			status: result?.status ?? "ok",
			timestamp: new Date().toISOString(),
		};
	},

	formatOutput(output, format) {
		if (format === "compact") return output.status;
		return JSON.stringify(output, null, 2);
	},
};
