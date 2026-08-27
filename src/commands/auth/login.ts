import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ElnoraApiClient } from "../../lib/client.js";
import { AuthError, ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";
import { getApiKey, listProfileNames, saveProfile, validateProfileName } from "../../lib/profiles.js";
import { promptSecret } from "../../lib/prompt.js";
import { readStdin } from "../../lib/stdin.js";
import { isTTY } from "../../lib/tty.js";
import { probeOrganizationCount } from "../_shared/auth-probe.js";

const inputSchema = z.object({
	apiKey: z.string().optional().describe("Elnora API key (elnora_live_...)"),
	apiKeyStdin: z.boolean().default(false).describe("Read the API key from stdin instead of an argument"),
	profile: z.string().default("default").describe("Profile name to save key under"),
});

type Input = z.infer<typeof inputSchema>;

export const authLogin: ElnoraCommand<Input> = {
	name: "auth.login",
	group: "auth",
	description: "Set up authentication by saving an API key to a profile",
	inputSchema,
	outputSchema: z.any(),
	annotations: { exposeInMcp: false },

	async execute(input, _ctx) {
		let apiKey = input.apiKey;
		const profileName = input.profile;
		validateProfileName(profileName);

		// --api-key and --api-key-stdin are mutually exclusive.
		if (input.apiKeyStdin && apiKey) {
			throw new ValidationError(
				"Cannot use --api-key and --api-key-stdin together. Choose one.",
				'Pipe the key:  printf %s "$ELNORA_API_KEY" | elnora auth login --api-key-stdin',
			);
		}

		// --api-key-stdin: read the key from piped stdin so it never appears in
		// the process command line (where `ps` / Win32_Process can read it).
		if (input.apiKeyStdin) {
			// stdin.isTTY (not lib/tty.isTTY, which checks stdout): nothing piped → would hang.
			if (process.stdin.isTTY) {
				throw new ValidationError(
					"--api-key-stdin requires the key on stdin, but stdin is a terminal.",
					'Example:  printf %s "$ELNORA_API_KEY" | elnora auth login --api-key-stdin',
				);
			}
			const piped = (await readStdin()).trim();
			if (!piped) {
				throw new ValidationError(
					"No API key received on stdin.",
					'Pipe a key:  printf %s "$ELNORA_API_KEY" | elnora auth login --api-key-stdin',
				);
			}
			apiKey = piped;
		}

		// Honor ELNORA_API_KEY / ELNORA_MCP_API_KEY when no key was supplied via
		// flag or stdin — enables non-interactive `ELNORA_API_KEY=... elnora auth login`.
		if (!apiKey) {
			const envKey = process.env.ELNORA_API_KEY ?? process.env.ELNORA_MCP_API_KEY;
			if (envKey) apiKey = envKey;
		}

		const existing = listProfileNames();
		const profileExists = existing.includes(profileName);

		// No --api-key flag provided
		if (!apiKey) {
			// Profile already exists and has a key — check if it still works
			if (profileExists) {
				let savedKey: string | undefined;
				try {
					savedKey = getApiKey(profileName);
				} catch {
					/* no key */
				}

				if (savedKey && isTTY()) {
					process.stderr.write(`\n  Checking profile "${profileName}"...`);
					try {
						const client = new ElnoraApiClient(savedKey);
						const orgCount = await probeOrganizationCount(client);
						process.stderr.write(` authenticated (${orgCount} organization${orgCount !== 1 ? "s" : ""}).\n\n`);
						process.stderr.write("  To update your API key, run:\n");
						process.stderr.write(
							`    elnora auth login --api-key <new-key>${profileName !== "default" ? ` --profile ${profileName}` : ""}\n\n`,
						);
						// Return null to suppress stdout output — all info already on stderr
						return null;
					} catch {
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
				try {
					apiKey = await promptSecret("  API key (Ctrl+C to cancel): ");
				} catch {
					process.stderr.write("\n  Login cancelled.\n\n");
					process.exit(0);
				}
				process.stderr.write("\n");
			}
		}

		if (!apiKey) {
			throw new ValidationError(
				"API key is required. Pass --api-key, pipe it with --api-key-stdin, set ELNORA_API_KEY, or run interactively in a terminal.",
				"Get your API key from: https://platform.elnora.ai > Settings > API Keys",
			);
		}

		const key = apiKey.trim();
		if (!key.startsWith("elnora_live_")) {
			throw new AuthError("API key must start with 'elnora_live_'. Check that you copied the full key.", {
				suggestion: "Get your API key from: https://platform.elnora.ai > Settings > API Keys",
			});
		}
		if (key.length < 20) {
			throw new AuthError("API key looks too short. Make sure you copied the full key.", {
				suggestion: "Get your API key from: https://platform.elnora.ai > Settings > API Keys",
			});
		}

		if (isTTY()) {
			process.stderr.write("  Verifying...");
		}

		try {
			const tempClient = new ElnoraApiClient(key);
			const orgCount = await probeOrganizationCount(tempClient);
			const configPath = saveProfile(profileName, key);

			if (isTTY()) {
				process.stderr.write(` Done! ${orgCount} organization${orgCount !== 1 ? "s" : ""} accessible.\n`);
				process.stderr.write(`  Saved to profile "${profileName}" at ${configPath}\n\n`);
				// Guidance goes to stderr so stdout stays clean, machine-readable data.
				process.stderr.write("  Next steps:\n");
				process.stderr.write("    elnora tasks list                            See your tasks\n");
				process.stderr.write('    elnora tasks create --message "..." --stream  Start a conversation\n');
				process.stderr.write("    elnora doctor                                Verify your setup\n\n");
			}

			return { profile: profileName, verified: true, configPath };
		} catch (err) {
			if (isTTY()) {
				process.stderr.write("\n");
			}
			if (err instanceof AuthError) {
				throw new AuthError("API key is invalid or has been revoked. Please check your key and try again.", {
					suggestion: "Get a new key from: https://platform.elnora.ai > Settings > API Keys",
				});
			}
			throw err;
		}
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		const data = output as { profile?: string };
		if (format === "compact") return data.profile ?? JSON.stringify(output);
		// Machine-readable result on stdout; the human "Next steps" guidance is
		// written to stderr during execute so it survives any output format.
		return JSON.stringify(output, null, 2);
	},
};
