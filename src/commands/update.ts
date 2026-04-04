import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, createWriteStream, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { VERSION } from "../lib/config.js";
import { isColorEnabled } from "../lib/tty.js";
import { isNewerVersion } from "../lib/update-check.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@elnora-ai/cli/latest";
const GITHUB_REPO = "Elnora-AI/elnora-cli";
const INSTALL_SCRIPT_URL = "https://cli.elnora.ai/install.sh";
const INSTALL_PS1_URL = "https://cli.elnora.ai/install.ps1";

function getPlatformTarget(): { target: string; ext: string } | null {
	const platform = process.platform;
	const arch = process.arch === "arm64" ? "arm64" : "x64";

	switch (platform) {
		case "darwin":
			return { target: `elnora-macos-${arch}`, ext: "tar.gz" };
		case "linux":
			return { target: `elnora-linux-${arch}`, ext: "tar.gz" };
		case "win32":
			return { target: `elnora-win-${arch}.exe`, ext: "zip" };
		default:
			return null;
	}
}

function getManualInstallHint(): string {
	if (process.platform === "win32") {
		return `  irm ${INSTALL_PS1_URL} | iex`;
	}
	return `  curl -fsSL ${INSTALL_SCRIPT_URL} | bash`;
}

async function downloadToFile(url: string, dest: string, timeoutMs = 120_000): Promise<void> {
	const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
	if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
	const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);
	await pipeline(nodeStream, createWriteStream(dest));
}

function verifyChecksum(filePath: string, expectedHash: string): boolean {
	const hash = createHash("sha256").update(readFileSync(filePath)).digest("hex");
	return hash.toLowerCase() === expectedHash.toLowerCase();
}

export function addUpdateCommand(program: Command): void {
	program
		.command("update")
		.description("Update Elnora CLI to the latest version")
		.action(async () => {
			const color = isColorEnabled();
			const hint = getManualInstallHint();

			// Check latest version
			let latest: string;
			try {
				const res = await fetch(NPM_REGISTRY_URL, {
					signal: AbortSignal.timeout(5000),
				});
				if (!res.ok) {
					console.error("Failed to check for updates. Try manually:");
					console.error(hint);
					process.exit(1);
				}
				const data = (await res.json()) as { version?: string };
				latest = data.version ?? "unknown";
			} catch {
				console.error("Failed to reach registry. Try manually:");
				console.error(hint);
				process.exit(1);
			}

			if (latest === VERSION || !isNewerVersion(latest, VERSION)) {
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

			const platformInfo = getPlatformTarget();
			if (!platformInfo) {
				console.error(`\nUnsupported platform: ${process.platform}. Try manually:`);
				console.error(`  npm update -g @elnora-ai/cli`);
				process.exit(1);
			}

			const { target, ext } = platformInfo;
			const tag = `v${latest}`;
			const binaryUrl = `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${target}.${ext}`;
			const checksumUrl = `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${target}.sha256`;

			const tmp = join(tmpdir(), `elnora-update-${Date.now()}`);
			mkdirSync(tmp, { recursive: true });
			const archivePath = join(tmp, `${target}.${ext}`);

			try {
				// Download binary archive
				await downloadToFile(binaryUrl, archivePath);

				// Download and verify checksum
				try {
					const checksumRes = await fetch(checksumUrl, { signal: AbortSignal.timeout(15_000) });
					if (checksumRes.ok) {
						const checksumText = await checksumRes.text();
						const expected = checksumText.split(/\s/)[0].trim();
						if (expected.length === 64 && !verifyChecksum(archivePath, expected)) {
							console.error("\nChecksum verification failed. The download may be corrupted.");
							console.error("Try again, or install manually:");
							console.error(hint);
							process.exit(1);
						}
					}
				} catch {
					// Non-fatal: proceed without checksum if fetch fails
				}

				// Extract and install
				if (process.platform === "win32") {
					// Use PowerShell to extract zip
					const extractDir = join(tmp, "extracted");
					execFileSync("powershell", [
						"-NoProfile",
						"-Command",
						`Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}' -Force`,
					]);
					const binaryPath = join(extractDir, target);
					const installDir = join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".elnora", "bin");
					mkdirSync(installDir, { recursive: true });
					const dest = join(installDir, "elnora.exe");
					copyFileSync(binaryPath, dest);
				} else {
					// Unix: extract tar.gz
					execFileSync("tar", ["-xzf", archivePath, "-C", tmp]);
					const extractedBinary = join(tmp, target);
					const installDir = process.env.ELNORA_INSTALL_DIR ?? join(process.env.HOME ?? "", ".local", "bin");
					mkdirSync(installDir, { recursive: true });
					const dest = join(installDir, "elnora");
					copyFileSync(extractedBinary, dest);
					chmodSync(dest, 0o755);
				}

				const doneMsg = color ? `${pc.green("✓")} Updated to v${latest}` : `✓ Updated to v${latest}`;
				console.error(doneMsg);
			} catch {
				console.error("\nUpdate failed. Try manually:");
				console.error(hint);
				process.exit(1);
			} finally {
				try {
					rmSync(tmp, { recursive: true, force: true });
				} catch {
					/* ignore */
				}
			}
		});
}
