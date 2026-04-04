import { execFileSync } from "node:child_process";
import type { Command } from "commander";
import pc from "picocolors";
import { VERSION } from "../lib/config.js";
import { isColorEnabled } from "../lib/tty.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@elnora-ai/cli/latest";
const INSTALL_SCRIPT_URL = "https://cli.elnora.ai/install.sh";

export function addUpdateCommand(program: Command): void {
	program
		.command("update")
		.description("Update Elnora CLI to the latest version")
		.action(async () => {
			const color = isColorEnabled();

			// Check latest version
			let latest: string;
			try {
				const res = await fetch(NPM_REGISTRY_URL, {
					signal: AbortSignal.timeout(5000),
				});
				if (!res.ok) {
					console.error("Failed to check for updates. Try manually:");
					console.error(`  curl -fsSL ${INSTALL_SCRIPT_URL} | bash`);
					process.exit(1);
				}
				const data = (await res.json()) as { version?: string };
				latest = data.version ?? "unknown";
			} catch {
				console.error("Failed to reach registry. Try manually:");
				console.error(`  curl -fsSL ${INSTALL_SCRIPT_URL} | bash`);
				process.exit(1);
			}

			if (latest === VERSION) {
				const msg = color
					? `${pc.green("✓")} Already on the latest version (v${VERSION})`
					: `✓ Already on the latest version (v${VERSION})`;
				console.error(msg);
				return;
			}

			const msg = color
				? `Updating Elnora CLI ${pc.dim(`v${VERSION}`)} → ${pc.green(`v${latest}`)}...`
				: `Updating Elnora CLI v${VERSION} → v${latest}...`;
			console.error(msg);

			// Download install script then execute it — no user input, all constants
			try {
				const script = execFileSync("curl", ["-fsSL", INSTALL_SCRIPT_URL], {
					encoding: "utf-8",
					timeout: 15000,
				});
				execFileSync("bash", ["-s", "--"], {
					input: script,
					stdio: ["pipe", "inherit", "inherit"],
				});
			} catch {
				console.error("\nUpdate failed. Try manually:");
				console.error(`  curl -fsSL ${INSTALL_SCRIPT_URL} | bash`);
				process.exit(1);
			}
		});
}
