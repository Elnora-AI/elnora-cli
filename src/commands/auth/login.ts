import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ElnoraApiClient } from "../../lib/client.js";
import { AuthError, ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";
import { saveProfile, validateProfileName } from "../../lib/profiles.js";

const inputSchema = z.object({
	apiKey: z.string().optional().describe("Elnora API key (elnora_live_...)"),
	profile: z.string().default("default").describe("Profile name to save key under"),
});

type Input = z.infer<typeof inputSchema>;

export const authLogin: ElnoraCommand<Input> = {
	name: "auth.login",
	group: "auth",
	description: "Set up authentication by saving an API key to a profile",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, _ctx) {
		const apiKey = input.apiKey;
		if (!apiKey) {
			throw new ValidationError(
				"API key is required. Use --api-key flag to provide it.",
				"Get your API key from: https://platform.elnora.ai > Settings > API Keys",
			);
		}

		const key = apiKey.trim();
		if (!key.startsWith("elnora_live_")) {
			throw new AuthError("API key must start with 'elnora_live_'.");
		}
		if (key.length < 20) {
			throw new AuthError("API key looks too short. Check your key and try again.");
		}

		const profileName = input.profile;
		validateProfileName(profileName);

		// Verify the key works by calling GET /projects
		const tempClient = new ElnoraApiClient(key);
		await tempClient.get("projects", { queryParams: { page: 1, pageSize: 1 } });

		const configPath = saveProfile(profileName, key);
		return { profile: profileName, verified: true, configPath };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { profile?: string }).profile ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
