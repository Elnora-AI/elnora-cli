import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { loadProfiles } from "../../lib/profiles.js";

const inputSchema = z.object({});

type Input = z.infer<typeof inputSchema>;

export const authProfiles: ElnoraCommand<Input> = {
	name: "auth.profiles",
	group: "auth",
	description: "List all configured profiles",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(_input, _ctx) {
		const profiles = loadProfiles();
		const items: { name: string; apiKey: string }[] = [];

		for (const [name, data] of Object.entries(profiles)) {
			const key = data.api_key ?? "";
			const masked = key.length > 16
				? key.slice(0, 12) + "..." + key.slice(-4)
				: "[invalid]";
			items.push({ name, apiKey: masked });
		}

		return { profiles: items };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") {
			const profiles = (output as { profiles?: { name: string }[] }).profiles ?? [];
			return profiles.map((p) => p.name).join(", ");
		}
		return JSON.stringify(output, null, 2);
	},
};
