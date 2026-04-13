import type { Command } from "commander";
import { ElnoraApiClient } from "../lib/client.js";
import { resolveApiKey } from "../lib/profiles.js";

/** Mask an API key for safe display — never log the full key. */
function maskApiKey(key: string): string {
	if (key.length > 20) return `${key.slice(0, 16)}...${key.slice(-4)}`;
	return `${key.slice(0, 4)}...`;
}

export function addWhoamiCommand(program: Command): void {
	program
		.command("whoami")
		.description("Show current authentication context")
		.action(async () => {
			const parentOpts = program.opts();
			const profileName = (parentOpts.profile as string) ?? "default";

			try {
				const key = resolveApiKey(profileName);
				const masked = maskApiKey(key);

				// Try to fetch org info
				let orgName = "unknown";
				try {
					const client = new ElnoraApiClient(key);
					const orgs = await client.get<unknown[]>("organizations");
					const orgList = Array.isArray(orgs) ? orgs : (((orgs as Record<string, unknown>)?.items as unknown[]) ?? []);
					if (orgList.length > 0) orgName = (orgList[0] as Record<string, string>)?.name ?? "unknown";
				} catch {
					/* org fetch is best-effort */
				}

				if (parentOpts.json) {
					console.log(JSON.stringify({ profile: profileName, apiKey: masked, orgName }, null, 2));
				} else {
					console.log(`\nProfile:  ${profileName}`);
					console.log(`API Key:  ${masked}`);
					console.log(`Org:      ${orgName}`);
					console.log("");
				}
			} catch (e) {
				console.error(e instanceof Error ? e.message : "Not authenticated");
				console.error("Run: elnora auth login");
				process.exit(3);
			}
		});
}
