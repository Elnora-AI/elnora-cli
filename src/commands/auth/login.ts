import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ElnoraApiClient } from "../../lib/client.js";
import { AuthError, ElnoraError, ServerError, ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";
import { saveProfile, validateProfileName } from "../../lib/profiles.js";

const inputSchema = z.object({
	apiKey: z.string().optional().describe("Elnora API key (elnora_live_...)"),
	profile: z.string().default("default").describe("Profile name to save key under"),
});

type Input = z.infer<typeof inputSchema>;

interface LoginResult {
	profile: string;
	verified: true;
	configPath: string;
	project: { id: string; name: string };
	projectCreated: boolean;
	/** Set to true when auto-project-creation failed. Agent should call projects.create. */
	projectCreationFailed?: boolean;
}

export const authLogin: ElnoraCommand<Input> = {
	name: "auth.login",
	group: "auth",
	description: "Set up authentication by saving an API key to a profile",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, _ctx) {
		// Scenario 1: No API key provided
		if (!input.apiKey) {
			throw new ValidationError(
				"API key is required. Use --api-key flag to provide it.",
				"1. Get your API key from: https://platform.elnora.ai > Settings > API Keys\n" +
					"2. Run: elnora auth login --api-key elnora_live_YOUR_KEY",
			);
		}

		const key = input.apiKey.trim();

		// Scenario 2: Wrong prefix
		if (!key.startsWith("elnora_live_")) {
			throw new AuthError("Invalid API key format. Key must start with 'elnora_live_'.", {
				suggestion:
					"1. Copy your full API key from: https://platform.elnora.ai > Settings > API Keys\n" +
					"2. Run: elnora auth login --api-key elnora_live_YOUR_KEY",
			});
		}

		// Scenario 3: Key too short
		if (key.length < 20) {
			throw new AuthError("API key looks incomplete. Make sure you copied the full key.", {
				suggestion:
					"1. Copy your full API key from: https://platform.elnora.ai > Settings > API Keys\n" +
					"2. Run: elnora auth login --api-key elnora_live_YOUR_KEY",
			});
		}

		const profileName = input.profile;
		validateProfileName(profileName);

		// Verify the key and check for existing projects
		let projectsResult: { items?: Array<{ id: string; name: string }>; totalCount?: number };
		const tempClient = new ElnoraApiClient(key);
		try {
			projectsResult = await tempClient.get("projects", { queryParams: { page: 1, pageSize: 1 } });
		} catch (err) {
			if (err instanceof AuthError) {
				throw new AuthError("API key is invalid or has been revoked.", {
					suggestion:
						"1. Check that you copied the correct key from: https://platform.elnora.ai > Settings > API Keys\n" +
						"2. If the key was revoked, create a new one and try again.\n" +
						"3. Run: elnora auth login --api-key elnora_live_YOUR_NEW_KEY",
				});
			}
			if (err instanceof ElnoraError && err.code === "NETWORK_ERROR") {
				throw new ElnoraError("Could not reach platform.elnora.ai. Check your internet connection.", {
					code: "NETWORK_ERROR",
					suggestion:
						"1. Make sure you're connected to the internet.\n" +
						"2. Try: curl -s https://platform.elnora.ai/health\n" +
						"3. Then retry: elnora auth login --api-key YOUR_KEY",
				});
			}
			if (err instanceof ElnoraError && err.code === "TIMEOUT") {
				throw new ElnoraError("Connection to platform.elnora.ai timed out.", {
					code: "TIMEOUT",
					suggestion: "1. Check your internet connection.\n" + "2. Try again: elnora auth login --api-key YOUR_KEY",
				});
			}
			if (err instanceof ServerError) {
				throw new ServerError("Elnora servers are temporarily unavailable. Try again in a few minutes.");
			}
			throw err;
		}

		// Save profile — catch write errors
		let configPath: string;
		try {
			configPath = saveProfile(profileName, key);
		} catch {
			const isWindows = process.platform === "win32";
			const fix = isWindows
				? "Check that you have write access to %USERPROFILE%\\.elnora\\"
				: "Fix: mkdir -p ~/.elnora && chmod 700 ~/.elnora";
			throw new ElnoraError("Could not save API key to config file. Check file permissions.", {
				code: "CONFIG_WRITE_ERROR",
				suggestion: `${fix} — then retry: elnora auth login --api-key YOUR_KEY`,
			});
		}

		const hasProjects = (projectsResult?.totalCount ?? projectsResult?.items?.length ?? 0) > 0;
		let project: { id: string; name: string };
		let projectCreated = false;

		if (hasProjects && projectsResult.items?.[0]) {
			project = { id: projectsResult.items[0].id, name: projectsResult.items[0].name };
		} else {
			// Auto-create a default project for new users
			try {
				const created = await tempClient.post<{ id: string; name: string }>("projects", {
					name: "My First Project",
				});
				project = { id: created.id, name: created.name };
				projectCreated = true;
			} catch {
				// Project creation failed — auth still succeeded, guide user/agent to create manually
				return {
					profile: profileName,
					verified: true,
					configPath,
					project: { id: "", name: "" },
					projectCreated: false,
					projectCreationFailed: true,
				} as LoginResult;
			}
		}

		return { profile: profileName, verified: true, configPath, project, projectCreated } as LoginResult;
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		const data = output as LoginResult;
		if (format === "compact") return data.profile ?? JSON.stringify(output);

		const lines = [`✓ Authenticated! API key saved to profile "${data.profile}".`];

		if (data.projectCreated) {
			lines.push(`✓ Created project "${data.project?.name}".`);
		}

		// If project auto-create failed (empty id), guide user to create manually
		if (!data.project?.id) {
			lines.push("", "Create a project to get started:", '  elnora projects create --name "My First Project"');
		} else {
			lines.push(
				"",
				"Start a conversation with Elnora:",
				`  elnora tasks create --project ${data.project.id} --message "Hello Elnora" --stream`,
			);
		}

		lines.push(
			"",
			"Other commands:",
			"  elnora projects list    See all your projects",
			"  elnora doctor           Verify your setup",
		);

		return lines.join("\n");
	},
};
