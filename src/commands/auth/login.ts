import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ElnoraApiClient } from "../../lib/client.js";
import { AuthError, ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";
import { saveProfile, validateProfileName } from "../../lib/profiles.js";
import { promptSecret } from "../../lib/prompt.js";
import { isTTY } from "../../lib/tty.js";

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
		let apiKey = input.apiKey;

		if (!apiKey && isTTY()) {
			process.stderr.write("\n  Set up Elnora CLI authentication\n");
			process.stderr.write("  Get your API key at: https://platform.elnora.ai > Settings > API Keys\n\n");
			apiKey = await promptSecret("  API key: ");
			process.stderr.write("\n");
		}

		if (!apiKey) {
			throw new ValidationError(
				"API key is required. Use --api-key flag or run interactively in a terminal.",
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

		if (isTTY()) {
			process.stderr.write("  Verifying...");
		}

		const tempClient = new ElnoraApiClient(key);
		const result = await tempClient.get<{ items?: unknown[]; totalCount?: number }>("projects", {
			queryParams: { page: 1, pageSize: 1 },
		});

		const projectCount = result?.totalCount ?? result?.items?.length ?? 0;
		const configPath = saveProfile(profileName, key);

		if (isTTY()) {
			process.stderr.write(` Done! ${projectCount} project${projectCount !== 1 ? "s" : ""} accessible.\n`);
			process.stderr.write(`  Saved to profile "${profileName}" at ${configPath}\n\n`);
		}

		return { profile: profileName, verified: true, configPath };
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		const data = output as { profile?: string };
		if (format === "compact") return data.profile ?? JSON.stringify(output);

		const lines = [
			`✓ Authenticated! API key saved to profile "${data.profile}".`,
			"",
			"Next steps:",
			"  elnora projects list                         See your projects",
			"  elnora tasks create --project <ID> --stream  Start a conversation",
			"  elnora doctor                                Verify your setup",
		];
		return lines.join("\n");
	},
};
