import type { Command } from "commander";
import { ElnoraApiClient } from "../lib/client.js";
import { resolveApiKey, resolveCredentialHint } from "../lib/profiles.js";

export function addWhoamiCommand(program: Command): void {
	program
		.command("whoami")
		.description("Show current authentication context")
		.action(async () => {
			const parentOpts = program.opts();
			const profileName = (parentOpts.profile as string) ?? "default";

			try {
				const hint = resolveCredentialHint(profileName);

				// Try to fetch org info
				let orgName = "unknown";
				try {
					const client = new ElnoraApiClient(resolveApiKey(profileName));
					const orgs = await client.get<unknown[]>("organizations");
					const orgList = Array.isArray(orgs) ? orgs : (((orgs as Record<string, unknown>)?.items as unknown[]) ?? []);
					if (orgList.length > 0) orgName = (orgList[0] as Record<string, string>)?.name ?? "unknown";
				} catch {
					/* org fetch is best-effort */
				}

				if (parentOpts.json) {
					console.log(JSON.stringify({ profile: profileName, credential: hint, orgName }, null, 2));
				} else {
					console.log(`\nProfile:     ${profileName}`);
					console.log(`Credential:  ${hint}`);
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
