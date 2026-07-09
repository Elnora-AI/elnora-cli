import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	chmodSync,
	copyFileSync,
	createWriteStream,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { VERSION } from "../lib/config.js";
import { detectInstallMethod, getUpdateInstruction } from "../lib/install-method.js";
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

async function fetchLatestVersion(): Promise<string> {
	const res = await fetch(NPM_REGISTRY_URL, { signal: AbortSignal.timeout(5000) });
	if (!res.ok) throw new Error(`Registry returned HTTP ${res.status}`);
	const data = (await res.json()) as { version?: string };
	return data.version ?? "unknown";
}

async function downloadToFile(url: string, dest: string): Promise<void> {
	const res = await fetch(url, { signal: AbortSignal.timeout(120_000), redirect: "follow" });
	if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
	const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);
	await pipeline(nodeStream, createWriteStream(dest));
}

/**
 * Place a freshly-downloaded `elnora.exe` into `installDir` on Windows.
 *
 * Windows refuses to overwrite a running PE executable (the loader holds an
 * exclusive lock), but it *does* allow renaming it. Since `elnora update
 * --install` runs from inside the very binary it's replacing, we move the
 * in-use binary aside first, then drop the new one into place — the canonical
 * Windows self-update pattern. The renamed `.old-*` file is still locked while
 * the current process runs; it (and any from earlier updates) is swept on a
 * later invocation once the OS frees the lock.
 *
 * Exported for testing. Returns the destination path.
 */
export function installWindowsBinary(srcPath: string, installDir: string): string {
	mkdirSync(installDir, { recursive: true });
	const dest = join(installDir, "elnora.exe");
	try {
		renameSync(dest, `${dest}.old-${Date.now()}`);
	} catch (e) {
		// ENOENT just means there's nothing to move (first install / external
		// removal). Anything else is a real failure worth surfacing.
		if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
	}
	copyFileSync(srcPath, dest);
	// Best-effort sweep of `.old-*` binaries left by previous updates.
	for (const name of readdirSync(installDir)) {
		if (name.startsWith("elnora.exe.old-")) {
			try {
				rmSync(join(installDir, name), { force: true });
			} catch {
				/* still locked / in use — will be swept on a later run */
			}
		}
	}
	return dest;
}

async function installBinaryUpdate(latest: string): Promise<void> {
	const color = isColorEnabled();
	const platformInfo = getPlatformTarget();
	if (!platformInfo) {
		console.error(`Unsupported platform: ${process.platform}.`);
		console.error("Try: npm install -g @elnora-ai/cli@latest");
		process.exitCode = 1;
		return;
	}

	const { target, ext } = platformInfo;
	const binaryUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latest}/${target}.${ext}`;
	const checksumUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latest}/${target}.sha256`;

	const tmp = join(tmpdir(), `elnora-update-${Date.now()}`);
	mkdirSync(tmp, { recursive: true });
	const archivePath = join(tmp, `${target}.${ext}`);

	try {
		console.error("Downloading...");
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
						console.error("Checksum verification failed. The download may be corrupted.");
						process.exitCode = 1;
						return;
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
			installWindowsBinary(join(extractDir, target), installDir);
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
	} finally {
		try {
			rmSync(tmp, { recursive: true, force: true });
		} catch {
			/* ignore */
		}
	}
}

export function addUpdateCommand(program: Command): void {
	program
		.command("update")
		.description("Check for updates (use --install to apply)")
		.option("--install", "Download and install the update")
		.action(async (opts: { install?: boolean }) => {
			const color = isColorEnabled();
			const method = detectInstallMethod();

			// Check latest version
			let latest: string;
			try {
				latest = await fetchLatestVersion();
			} catch {
				console.error("Failed to check for updates.");
				process.exitCode = 1;
				return;
			}

			if (latest === "unknown") {
				console.error("Could not determine latest version.");
				process.exitCode = 1;
				return;
			}

			// Already up to date
			if (latest === VERSION || !isNewerVersion(latest, VERSION)) {
				const msg = color
					? `${pc.green("✓")} Already on the latest version (v${VERSION})`
					: `✓ Already on the latest version (v${VERSION})`;
				console.error(msg);
				return;
			}

			// Update available
			const instruction = getUpdateInstruction(method);

			if (!opts.install) {
				// Check-only mode (default)
				const msg = color
					? `${pc.yellow("Update available:")} v${VERSION} → v${latest}`
					: `Update available: v${VERSION} → v${latest}`;
				console.error(msg);
				console.error(`Run: ${instruction}`);
				return;
			}

			// --install mode
			const msg = color
				? `Updating Elnora CLI ${pc.dim(`v${VERSION}`)} → ${pc.green(`v${latest}`)}...`
				: `Updating Elnora CLI v${VERSION} → v${latest}...`;
			console.error(msg);

			if (method === "npm") {
				console.error("Installed via npm. Run:");
				console.error(`  npm install -g @elnora-ai/cli@latest`);
				return;
			}

			if (method === "homebrew") {
				console.error("Installed via Homebrew. Run:");
				console.error(`  brew upgrade elnora`);
				return;
			}

			// Binary self-replace
			try {
				await installBinaryUpdate(latest);
			} catch (err) {
				// Bind the error — an empty catch turned every failure (network,
				// checksum, file-locked) into the same opaque message, leaving users
				// and bug reports with no idea what actually broke.
				const reason = err instanceof Error ? err.message : String(err);
				console.error(`Update failed: ${reason}`);
				console.error("Try manually:");
				console.error(
					process.platform === "win32"
						? "  irm https://cli.elnora.ai/install.ps1 | iex"
						: "  curl -fsSL https://cli.elnora.ai/install.sh | bash",
				);
				process.exitCode = 1;
			}
		});
}
