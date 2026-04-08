import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ElnoraApiClient } from "../../lib/client.js";
import { AuthError, ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";
import { getApiKey, listProfileNames, saveProfile, validateProfileName } from "../../lib/profiles.js";
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
		const profileName = input.profile;
		validateProfileName(profileName);

		const existing = listProfileNames();
		const profileExists = existing.includes(profileName);

		// No --api-key flag provided
		if (!apiKey) {
			// Profile already exists and has a key — show status, don't prompt
			if (profileExists) {
				let savedKey: string | undefined;
				try {
					savedKey = getApiKey(profileName);
				} catch {
					/* no key */
				}

				if (savedKey && isTTY()) {
					// Verify the existing key still works
					process.stderr.write(`\n  Checking profile "${profileName}"...`);
					try {
						const client = new ElnoraApiClient(savedKey);
						const result = await client.get<{ items?: unknown[]; totalCount?: number }>("projects", {
							queryParams: { page: 1, pageSize: 1 },
						});
						const projectCount = result?.totalCount ?? result?.items?.length ?? 0;
						process.stderr.write(` authenticated (${projectCount} project${projectCount !== 1 ? "s" : ""}).\n\n`);
						process.stderr.write("  To update your API key, run:\n");
						process.stderr.write(`    elnora auth login --api-key <new-key>${profileName !== "default" ? ` --profile ${profileName}` : ""}\n\n`);
						return { profile: profileName, verified: true, alreadyAuthenticated: true };
					} catch {
						// Key is invalid/expired — fall through to prompt for new key
						process.stderr.write(" key is invalid or expired.\n\n");
					}
				}
			}

			// Need a key — prompt interactively
			if (isTTY()) {
				if (profileExists) {
					process.stderr.write(`  Enter a new API key for profile "${profileName}"\n`);
				} else {
					process.stderr.write("\n  Set up Elnora CLI authentication\n");
				}
				process.stderr.write("  Get your API key at: https://platform.elnora.ai > Settings > API Keys\n\n");
				apiKey = await promptSecret("  API key (Ctrl+C to cancel): ");
				process.stderr.write("\n");
			}
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
		const data = output as { profile?: string; alreadyAuthenticated?: boolean };
		if (format === "compact") return data.profile ?? JSON.stringify(output);

		if (data.alreadyAuthenticated) {
			return `✓ Profile "${data.profile}" is authenticated.`;
		}

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
