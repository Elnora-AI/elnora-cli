import { existsSync, statSync } from "node:fs";
import type { Command } from "commander";
import pc from "picocolors";
import { ElnoraApiClient } from "../lib/client.js";
import { AI_SERVER_URL, VERSION } from "../lib/config.js";
import { PROFILES_FILE, resolveApiKey } from "../lib/profiles.js";
import { isColorEnabled } from "../lib/tty.js";

export function addDoctorCommand(program: Command): void {
	program
		.command("doctor")
		.description("Check Elnora CLI configuration and connectivity")
		.action(async () => {
			const color = isColorEnabled();
			const ok = (msg: string) => (color ? `  ${pc.green("✓")} ${msg}` : `  ✓ ${msg}`);
			const fail = (msg: string) => (color ? `  ${pc.red("✗")} ${msg}` : `  ✗ ${msg}`);
			const warn = (msg: string) => (color ? `  ${pc.yellow("!")} ${msg}` : `  ! ${msg}`);

			console.error(`\nElnora CLI v${VERSION}\n`);
			let passed = 0;
			let total = 0;

			// 1. API reachable
			total++;
			try {
				const start = Date.now();
				const res = await fetch("https://platform.elnora.ai/health", { signal: AbortSignal.timeout(5000) });
				const ms = Date.now() - start;
				if (res.ok) {
					console.error(ok(`API reachable         platform.elnora.ai (${res.status} OK, ${ms}ms)`));
					passed++;
				} else console.error(fail(`API unreachable       platform.elnora.ai (HTTP ${res.status})`));
			} catch (e) {
				console.error(
					fail(`API unreachable       platform.elnora.ai (${e instanceof Error ? e.message : "network error"})`),
				);
			}

			// 2. Authenticated
			total++;
			try {
				const key = resolveApiKey();
				const client = new ElnoraApiClient(key);
				const result = await client.get<{ items?: unknown[]; totalCount?: number }>("projects", {
					queryParams: { page: 1, pageSize: 1 },
				});
				const count = result?.totalCount ?? result?.items?.length ?? 0;
				console.error(ok(`Authenticated         profile: default (${count} projects accessible)`));
				passed++;
			} catch (e) {
				console.error(fail(`Authentication failed ${e instanceof Error ? e.message : "no API key"}`));
			}

			// 3. Version current
			total++;
			try {
				const res = await fetch("https://registry.npmjs.org/@elnora-ai/cli/latest", {
					signal: AbortSignal.timeout(3000),
				});
				if (res.ok) {
					const data = (await res.json()) as { version?: string };
					const latest = data.version ?? "unknown";
					if (latest === VERSION || latest === "unknown") {
						console.error(ok(`Version current       v${VERSION} (latest: v${latest})`));
					} else {
						console.error(warn(`Update available      v${VERSION} → v${latest}`));
					}
					passed++;
				} else {
					console.error(ok(`Version               v${VERSION} (registry check failed)`));
					passed++;
				}
			} catch {
				console.error(ok(`Version               v${VERSION} (registry unreachable)`));
				passed++;
			}

			// 4. Config permissions (Unix only)
			total++;
			if (process.platform === "win32") {
				console.error(ok("Config permissions    (skipped on Windows)"));
				passed++;
			} else if (!existsSync(PROFILES_FILE)) {
				console.error(warn("Config permissions    ~/.elnora/profiles.toml not found"));
			} else {
				const mode = statSync(PROFILES_FILE).mode & 0o777;
				if (mode === 0o600) {
					console.error(ok(`Config permissions    ${PROFILES_FILE} (0600)`));
					passed++;
				} else {
					console.error(warn(`Config permissions    ${PROFILES_FILE} (0${mode.toString(8)}) — should be 0600`));
				}
			}

			// 5. AI Server reachable
			total++;
			try {
				const start = Date.now();
				const res = await fetch(`${AI_SERVER_URL}/health`, { signal: AbortSignal.timeout(5000) });
				const ms = Date.now() - start;
				if (res.ok) {
					console.error(ok(`AI Server reachable   ${new URL(AI_SERVER_URL).hostname} (${res.status} OK, ${ms}ms)`));
					passed++;
				} else console.error(fail(`AI Server unreachable ${new URL(AI_SERVER_URL).hostname} (HTTP ${res.status})`));
			} catch {
				console.error(fail(`AI Server unreachable ${AI_SERVER_URL}`));
			}

			console.error("");
			if (passed === total) {
				console.error("All checks passed.");
			} else {
				console.error(`${passed}/${total} checks passed.`);
				if (!existsSync(PROFILES_FILE)) console.error("\nRun: elnora auth login");
			}
		});
}
