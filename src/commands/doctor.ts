import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { ElnoraApiClient } from "../lib/client.js";
import { AI_SERVER_URL, VERSION } from "../lib/config.js";
import { PROFILES_FILE, resolveApiKey } from "../lib/profiles.js";
import { CLAUDE_DIR, CLAUDE_SETTINGS_FILE, MARKETPLACE_NAME, PLUGIN_ID } from "../lib/setup/common.js";
import { isColorEnabled } from "../lib/tty.js";
import { isNewerVersion } from "../lib/update-check.js";

type CheckStatus = "pass" | "fail" | "warn" | "skip";
interface CheckResult {
	status: CheckStatus;
	msg: string;
}

const EXPECTED_SKILLS = [
	"elnora-admin",
	"elnora-agent",
	"elnora-files",
	"elnora-folders",
	"elnora-orgs",
	"elnora-platform",
	"elnora-projects",
	"elnora-search",
	"elnora-tasks",
];

/**
 * Run a check function, catching any thrown errors and reporting them as fail.
 */
async function runCheck(fn: () => Promise<CheckResult> | CheckResult): Promise<CheckResult> {
	try {
		return await fn();
	} catch (e) {
		return { status: "fail", msg: `${e instanceof Error ? e.message : String(e)}` };
	}
}

// -----------------------------------------------------------------------------
// Individual checks
// -----------------------------------------------------------------------------

async function checkApiReachable(): Promise<CheckResult> {
	const start = Date.now();
	const res = await fetch("https://platform.elnora.ai/health", { signal: AbortSignal.timeout(5000) });
	const ms = Date.now() - start;
	if (res.ok) return { status: "pass", msg: `API reachable         platform.elnora.ai (${res.status} OK, ${ms}ms)` };
	return { status: "fail", msg: `API unreachable       platform.elnora.ai (HTTP ${res.status})` };
}

async function checkAuthenticated(): Promise<CheckResult> {
	const key = resolveApiKey();
	const client = new ElnoraApiClient(key);
	const result = await client.get<{ items?: unknown[]; totalCount?: number }>("projects", {
		queryParams: { page: 1, pageSize: 1 },
	});
	const count = result?.totalCount ?? result?.items?.length ?? 0;
	return { status: "pass", msg: `Authenticated         profile: default (${count} projects accessible)` };
}

async function checkVersionCurrent(): Promise<CheckResult> {
	try {
		const res = await fetch("https://registry.npmjs.org/@elnora-ai/cli/latest", {
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) return { status: "pass", msg: `Version               v${VERSION} (registry check failed)` };
		const data = (await res.json()) as { version?: string };
		const latest = data.version ?? "unknown";
		if (latest === VERSION || latest === "unknown" || !isNewerVersion(latest, VERSION)) {
			return { status: "pass", msg: `Version current       v${VERSION} (latest: v${latest})` };
		}
		return { status: "warn", msg: `Update available      v${VERSION} → v${latest}` };
	} catch {
		return { status: "pass", msg: `Version               v${VERSION} (registry unreachable)` };
	}
}

function checkConfigPermissions(): CheckResult {
	if (process.platform === "win32") {
		return { status: "pass", msg: "Config permissions    (skipped on Windows)" };
	}
	if (!existsSync(PROFILES_FILE)) {
		return { status: "warn", msg: "Config permissions    ~/.elnora/profiles.toml not found" };
	}
	const mode = statSync(PROFILES_FILE).mode & 0o777;
	if (mode === 0o600) {
		return { status: "pass", msg: `Config permissions    ${PROFILES_FILE} (0600)` };
	}
	return { status: "warn", msg: `Config permissions    ${PROFILES_FILE} (0${mode.toString(8)}) — should be 0600` };
}

async function checkAiServerReachable(): Promise<CheckResult> {
	const start = Date.now();
	const res = await fetch(`${AI_SERVER_URL}/health`, { signal: AbortSignal.timeout(5000) });
	const ms = Date.now() - start;
	const host = new URL(AI_SERVER_URL).hostname;
	if (res.ok) return { status: "pass", msg: `AI Server reachable   ${host} (${res.status} OK, ${ms}ms)` };
	return { status: "fail", msg: `AI Server unreachable ${host} (HTTP ${res.status})` };
}

function checkPathConfigured(): CheckResult {
	const installDirs = [
		join(homedir(), ".local", "bin"),
		join(homedir(), ".elnora", "bin"),
	];
	const pathVar = process.env.PATH ?? "";
	const entries = pathVar.split(delimiter).filter(Boolean);
	const matched = installDirs.find((d) => entries.includes(d));
	if (matched) {
		return { status: "pass", msg: `PATH configured       ${matched}` };
	}
	// If neither standard install dir is in PATH, it doesn't mean the CLI is
	// broken — user may have installed via npm global or Homebrew (which put
	// `elnora` in a different location that IS in PATH, or we wouldn't be
	// running at all). Warn, don't fail.
	return {
		status: "warn",
		msg: "PATH configured       standard install dirs not in PATH (OK if installed via npm/brew)",
	};
}

function checkClaudePlugin(): CheckResult {
	if (!existsSync(CLAUDE_DIR)) {
		return { status: "skip", msg: "Plugin enabled         (Claude Code not installed)" };
	}
	if (!existsSync(CLAUDE_SETTINGS_FILE)) {
		return { status: "fail", msg: "Plugin enabled         settings.json not found — run 'elnora setup claude'" };
	}
	let settings: Record<string, unknown>;
	try {
		settings = JSON.parse(readFileSync(CLAUDE_SETTINGS_FILE, "utf-8")) as Record<string, unknown>;
	} catch (e) {
		return { status: "fail", msg: `Plugin enabled         settings.json unreadable (${e instanceof Error ? e.message : "parse error"})` };
	}
	const enabledPlugins = (settings.enabledPlugins as Record<string, boolean> | undefined) ?? {};
	const isEnabled = enabledPlugins[PLUGIN_ID] === true;
	const legacyKeys = Object.keys(enabledPlugins).filter((k) => k.startsWith("elnora@") && k !== PLUGIN_ID);
	if (isEnabled && legacyKeys.length === 0) {
		return { status: "pass", msg: `Plugin enabled         ${PLUGIN_ID}` };
	}
	if (isEnabled && legacyKeys.length > 0) {
		return {
			status: "warn",
			msg: `Plugin enabled         ${PLUGIN_ID} — but stale legacy entries also present: ${legacyKeys.join(", ")}`,
		};
	}
	if (legacyKeys.length > 0) {
		return {
			status: "fail",
			msg: `Plugin enabled         found legacy entries ${legacyKeys.join(", ")} but not ${PLUGIN_ID} — run 'elnora setup claude'`,
		};
	}
	return { status: "fail", msg: "Plugin enabled         not found — run 'elnora setup claude'" };
}

function checkSkillsInstalled(): CheckResult {
	if (!existsSync(CLAUDE_DIR)) {
		return { status: "skip", msg: "Skills installed       (Claude Code not installed)" };
	}
	const skillsDir = join(CLAUDE_DIR, "plugins", "marketplaces", MARKETPLACE_NAME, "elnora", "skills");
	if (!existsSync(skillsDir)) {
		return {
			status: "warn",
			msg: "Skills installed       marketplace not cloned yet — restart Claude Code to trigger clone",
		};
	}
	const found = EXPECTED_SKILLS.filter((s) => existsSync(join(skillsDir, s, "SKILL.md")));
	if (found.length === EXPECTED_SKILLS.length) {
		return { status: "pass", msg: `Skills installed       ${found.length} skills` };
	}
	const missing = EXPECTED_SKILLS.filter((s) => !found.includes(s));
	return {
		status: "fail",
		msg: `Skills installed       ${found.length}/${EXPECTED_SKILLS.length} — missing: ${missing.join(", ")}`,
	};
}

function checkPluginVersion(): CheckResult {
	if (!existsSync(CLAUDE_DIR)) {
		return { status: "skip", msg: "Plugin version         (Claude Code not installed)" };
	}
	const pluginJsonPath = join(
		CLAUDE_DIR,
		"plugins",
		"marketplaces",
		MARKETPLACE_NAME,
		"elnora",
		".claude-plugin",
		"plugin.json",
	);
	if (!existsSync(pluginJsonPath)) {
		return { status: "skip", msg: "Plugin version         (plugin not cloned yet)" };
	}
	try {
		const pj = JSON.parse(readFileSync(pluginJsonPath, "utf-8")) as { version?: string };
		const pluginVersion = pj.version ?? "unknown";
		if (pluginVersion === VERSION) {
			return { status: "pass", msg: `Plugin version         v${pluginVersion} (matches CLI)` };
		}
		return {
			status: "warn",
			msg: `Plugin version         v${pluginVersion} (CLI is v${VERSION}) — restart Claude Code to refresh`,
		};
	} catch (e) {
		return { status: "fail", msg: `Plugin version         plugin.json unreadable (${e instanceof Error ? e.message : "parse error"})` };
	}
}

async function checkMcpReachable(): Promise<CheckResult> {
	const start = Date.now();
	try {
		const res = await fetch("https://mcp.elnora.ai/mcp", {
			method: "HEAD",
			signal: AbortSignal.timeout(5000),
		});
		const ms = Date.now() - start;
		// 401 is expected (not authenticated) — means server is up. Any 2xx-4xx is "server up".
		if (res.status < 500) {
			return { status: "pass", msg: `Server reachable       mcp.elnora.ai (${res.status}, ${ms}ms)` };
		}
		return { status: "fail", msg: `Server unreachable     mcp.elnora.ai (HTTP ${res.status})` };
	} catch (e) {
		return {
			status: "fail",
			msg: `Server unreachable     mcp.elnora.ai (${e instanceof Error ? e.message : "network error"})`,
		};
	}
}

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export function addDoctorCommand(program: Command): void {
	program
		.command("doctor")
		.description("Check Elnora CLI configuration and connectivity")
		.action(async () => {
			const color = isColorEnabled();
			const ok = (msg: string) => (color ? `  ${pc.green("✓")} ${msg}` : `  ✓ ${msg}`);
			const fail = (msg: string) => (color ? `  ${pc.red("✗")} ${msg}` : `  ✗ ${msg}`);
			const warn = (msg: string) => (color ? `  ${pc.yellow("!")} ${msg}` : `  ! ${msg}`);
			const skip = (msg: string) => (color ? `  ${pc.dim("○")} ${msg}` : `  ○ ${msg}`);
			const section = (name: string) => (color ? pc.bold(`  ${name}`) : `  ${name}`);

			const render = (r: CheckResult) => {
				switch (r.status) {
					case "pass":
						return ok(r.msg);
					case "fail":
						return fail(r.msg);
					case "warn":
						return warn(r.msg);
					case "skip":
						return skip(r.msg);
				}
			};

			console.error(`\nElnora CLI v${VERSION}\n`);

			let passed = 0;
			let failed = 0;
			let warnings = 0;
			let total = 0;
			const tally = (r: CheckResult) => {
				total++;
				if (r.status === "pass" || r.status === "skip") passed++;
				else if (r.status === "warn") {
					passed++;
					warnings++;
				} else failed++;
			};

			// ------ CLI section ------
			console.error(section("CLI"));
			const cliChecks = [
				await runCheck(() => checkApiReachable()),
				await runCheck(() => checkAuthenticated()),
				await runCheck(() => checkVersionCurrent()),
				await runCheck(() => checkConfigPermissions()),
				await runCheck(() => checkAiServerReachable()),
				await runCheck(() => checkPathConfigured()),
			];
			for (const r of cliChecks) {
				console.error(render(r));
				tally(r);
			}
			console.error("");

			// ------ Claude Code section ------
			console.error(section("Claude Code"));
			const claudeChecks = [
				await runCheck(() => checkClaudePlugin()),
				await runCheck(() => checkSkillsInstalled()),
				await runCheck(() => checkPluginVersion()),
			];
			for (const r of claudeChecks) {
				console.error(render(r));
				tally(r);
			}
			console.error("");

			// ------ MCP section ------
			console.error(section("MCP"));
			const mcpChecks = [await runCheck(() => checkMcpReachable())];
			for (const r of mcpChecks) {
				console.error(render(r));
				tally(r);
			}
			console.error("");

			// ------ Summary ------
			if (failed === 0 && warnings === 0) {
				console.error("All checks passed.");
			} else if (failed === 0) {
				console.error(`${passed}/${total} checks passed (${warnings} warning${warnings === 1 ? "" : "s"}).`);
			} else {
				console.error(`${passed}/${total} checks passed — ${failed} failed.`);
				if (!existsSync(PROFILES_FILE)) console.error("\nRun: elnora auth login");
			}
		});
}
