import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { listProfileNames, removeProfile } from "../../lib/profiles.js";

const inputSchema = z.object({
	profile: z.string().optional().describe("Profile name to remove (default: 'default')"),
	all: z.boolean().default(false).describe("Remove all profiles"),
});

type Input = z.infer<typeof inputSchema>;

export const authLogout: ElnoraCommand<Input> = {
	name: "auth.logout",
	group: "auth",
	description: "Remove saved credentials",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute(input, _ctx) {
		if (input.all) {
			const names = listProfileNames();
			for (const name of names) {
				removeProfile(name);
			}
			return { loggedOut: true, profile: "all", removedCount: names.length };
		}

		const profileName = input.profile ?? "default";
		const removed = removeProfile(profileName);
		return { loggedOut: true, profile: profileName, removed };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { profile?: string }).profile ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
