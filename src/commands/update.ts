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

function getPlatformTarget(): { target: string; ext: string } | null {
	const arch = process.arch === "arm64" ? "arm64" : "x64";
	switch (process.platform) {
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

function getManualHint(): string {
	return process.platform === "win32"
		? "  irm https://cli.elnora.ai/install.ps1 | iex"
		: "  curl -fsSL https://cli.elnora.ai/install.sh | bash";
}

async function downloadToFile(url: string, dest: string): Promise<void> {
	const res = await fetch(url, { signal: AbortSignal.timeout(120_000), redirect: "follow" });
	if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
	const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);
	await pipeline(nodeStream, createWriteStream(dest));
}

export function addUpdateCommand(program: Command): void {
	program
		.command("update")
		.description("Update Elnora CLI to the latest version")
		.action(async () => {
			const color = isColorEnabled();
			const hint = getManualHint();

			// Check latest version
			let latest: string;
			try {
				const res = await fetch(NPM_REGISTRY_URL, { signal: AbortSignal.timeout(5000) });
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
				console.error("  npm update -g @elnora-ai/cli");
				process.exit(1);
			}

			const { target, ext } = platformInfo;
			const binaryUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latest}/${target}.${ext}`;
			const checksumUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latest}/${target}.sha256`;

			const tmp = join(tmpdir(), `elnora-update-${Date.now()}`);
			mkdirSync(tmp, { recursive: true });
			const archivePath = join(tmp, `${target}.${ext}`);

			try {
				await downloadToFile(binaryUrl, archivePath);

				// Verify checksum
				let checksumVerified = false;
				try {
					const checksumRes = await fetch(checksumUrl, { signal: AbortSignal.timeout(15_000) });
					if (checksumRes.ok) {
						const checksumText = await checksumRes.text();
						const expected = checksumText.split(/\s/)[0].trim();
						if (expected.length === 64) {
							const actual = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
							if (actual.toLowerCase() !== expected.toLowerCase()) {
								console.error("\nChecksum verification failed. The download may be corrupted.");
								console.error("Try again, or install manually:");
								console.error(hint);
								process.exit(1);
							}
							checksumVerified = true;
						}
					}
				} catch {
					/* continue without verification */
				}
				if (!checksumVerified) {
					console.error("Warning: Could not verify download checksum. Proceeding anyway.");
				}

				// Extract and install
				if (process.platform === "win32") {
					const extractDir = join(tmp, "extracted");
					execFileSync("powershell", [
						"-NoProfile",
						"-Command",
						`Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}' -Force`,
					]);
					const installDir = join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".elnora", "bin");
					mkdirSync(installDir, { recursive: true });
					copyFileSync(join(extractDir, target), join(installDir, "elnora.exe"));
				} else {
					execFileSync("tar", ["-xzf", archivePath, "-C", tmp]);
					const installDir = process.env.ELNORA_INSTALL_DIR ?? join(process.env.HOME ?? "", ".local", "bin");
					mkdirSync(installDir, { recursive: true });
					const dest = join(installDir, "elnora");
					copyFileSync(join(tmp, target), dest);
					chmodSync(dest, 0o755);
				}

				const done = color ? `${pc.green("✓")} Updated to v${latest}` : `✓ Updated to v${latest}`;
				console.error(done);
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
