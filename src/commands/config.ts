import type { Command } from "commander";
import { AI_SERVER_URL, BASE_URL, MCP_URL } from "../lib/config.js";
import { loadProfiles } from "../lib/profiles.js";

/**
 * Report WHERE the active API key would come from — never the key value.
 * Mirrors resolveApiKey precedence (env over profile) without throwing when
 * unauthenticated, so `config show` always succeeds offline.
 */
function resolveKeySource(profileName: string): string {
	// Mirror resolveApiKey's `??` (set-vs-unset) precedence so the reported source
	// matches what the CLI will actually use — even for a set-but-empty env var.
	if (process.env.ELNORA_API_KEY !== undefined) return "env:ELNORA_API_KEY";
	if (process.env.ELNORA_MCP_API_KEY !== undefined) return "env:ELNORA_MCP_API_KEY";
	const profiles = loadProfiles();
	if (profiles[profileName]?.api_key) return `profile:${profileName}`;
	return "none";
}

/**
 * `elnora config show` — print the resolved endpoints, active profile, and key
 * source in a stable, greppable form. Purely local: no network, no auth, no
 * mutation, always exit 0. Standalone (like doctor/whoami) so it works without
 * an API key and is never exposed as an MCP tool.
 */
export function addConfigCommand(program: Command): void {
	const config = program.command("config").description("Inspect Elnora CLI configuration");
	config
		.command("show")
		.description("Show resolved CLI configuration (endpoints, active profile, key source)")
		.action(() => {
			const parentOpts = program.opts();
			const profileName = (parentOpts.profile as string) ?? "default";
			const data = {
				base_url: BASE_URL,
				ai_server_url: AI_SERVER_URL,
				mcp_url: MCP_URL,
				active_profile: profileName,
				key_source: resolveKeySource(profileName),
			};

			// JSON when forced or when piped/redirected (non-TTY), matching the rest
			// of the CLI; stable key=value for interactive terminals.
			if (parentOpts.json || !process.stdout.isTTY) {
				console.log(JSON.stringify(data, null, 2));
				return;
			}
			// Stable key=value, fixed order — grep/cut friendly.
			console.log(`base_url=${data.base_url}`);
			console.log(`ai_server_url=${data.ai_server_url}`);
			console.log(`mcp_url=${data.mcp_url}`);
			console.log(`active_profile=${data.active_profile}`);
			console.log(`key_source=${data.key_source}`);
		});
}
