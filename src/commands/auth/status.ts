import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { probeOrganizationCount } from "../_shared/auth-probe.js";

const inputSchema = z.object({});

type Input = z.infer<typeof inputSchema>;

export const authStatus: ElnoraCommand<Input> = {
	name: "auth.status",
	group: "auth",
	description: "Verify API key and show connection info",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true, exposeInMcp: false },

	async execute(_input, ctx) {
		const organizationCount = await probeOrganizationCount(ctx.client);
		return { profile: ctx.profileName, authenticated: true, organizationCount };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return String((output as { authenticated?: boolean }).authenticated ?? "");
		return JSON.stringify(output, null, 2);
	},
};
