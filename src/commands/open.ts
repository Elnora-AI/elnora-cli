import { exec } from "node:child_process";
import type { Command } from "commander";

const URLS: Record<string, string> = {
	"": "https://platform.elnora.ai",
	platform: "https://platform.elnora.ai",
	docs: "https://docs.elnora.ai",
	keys: "https://platform.elnora.ai/settings/api-keys",
	billing: "https://platform.elnora.ai/settings/billing",
	github: "https://github.com/Elnora-AI/elnora-cli",
};

function openUrl(url: string): void {
	const cmd =
		process.platform === "darwin"
			? `open "${url}"`
			: process.platform === "win32"
				? `start "" "${url}"`
				: `xdg-open "${url}"`;
	exec(cmd, (err) => {
		if (err) {
			console.error(`Failed to open browser: ${err.message}`);
			console.log(url);
		}
	});
}

export function addOpenCommand(program: Command): void {
	program
		.command("open")
		.argument("[page]", "Page to open: platform, docs, keys, billing, github")
		.description("Open Elnora platform in the browser")
		.action((page: string | undefined) => {
			const key = page ?? "";
			const url = URLS[key];
			if (!url) {
				console.error(`Unknown page: ${page}`);
				console.error(`Available: ${Object.keys(URLS).filter(Boolean).join(", ")}`);
				process.exit(1);
			}
			openUrl(url);
			console.log(`Opening ${url}...`);
		});
}
