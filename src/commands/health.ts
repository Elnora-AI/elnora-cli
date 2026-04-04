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

	async execute(_input, _ctx) {
		// Health endpoint lives at /health, outside the /api/v1 prefix.
		// Use direct fetch instead of the API client.
		const response = await fetch("https://platform.elnora.ai/health", {
			signal: AbortSignal.timeout(5000),
		});
		const text = await response.text();
		let status: string;
		try {
			const data = JSON.parse(text) as { status?: string };
			status = data?.status ?? "ok";
		} catch {
			// Health endpoint may return plain text (e.g., "ok")
			status = response.ok ? text.trim() || "ok" : `error (HTTP ${response.status})`;
		}
		return { status, timestamp: new Date().toISOString() };
	},

	formatOutput(output, format) {
		if (format === "compact") return output.status;
		return JSON.stringify(output, null, 2);
	},
};
