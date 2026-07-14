import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { ElnoraApiClient } from "../lib/client.js";
import { AI_SERVER_URL, MCP_URL, VERSION } from "../lib/config.js";
import { detectAllInstalls, uninstallCommandFor } from "../lib/install-discovery.js";
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
	"elnora-review",
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
	const installDirs = [join(homedir(), ".local", "bin"), join(homedir(), ".elnora", "bin")];
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

function checkShadowInstalls(): CheckResult {
	const installs = detectAllInstalls();
	const active = installs.find((i) => i.active);
	// If we can't identify the active install on PATH (e.g. running from a dev
	// build / non-PATH location), we can't reliably call others "shadows" — skip
	// rather than emit a misleading warning.
	if (!active) {
		return { status: "skip", msg: "Shadow installs        (running from a non-PATH/dev build)" };
	}
	const shadows = installs.filter((i) => !i.active && i.source !== "dev");
	if (shadows.length === 0) {
		return { status: "pass", msg: `No shadow installs     ${active.path} (${active.source})` };
	}
	// Shadow installs make `elnora` ambiguous and cause stale-version confusion,
	// but the CLI still runs — warn (non-fatal), don't fail.
	const lines = shadows.map((s) => {
		const cmd = uninstallCommandFor(s);
		return `      shadow: ${s.path} (${s.source})${cmd ? ` — ${cmd}` : " — remove manually"}`;
	});
	return {
		status: "warn",
		msg: `Shadow installs        ${shadows.length} other elnora on PATH (active: ${active.path} [${active.source}])\n${lines.join("\n")}`,
	};
}

/** The enabledPlugins map from a settings.json, plus a parse-error note if unreadable. */
interface SettingsRead {
	enabledPlugins: Record<string, boolean>;
	unreadable?: string;
}

/** Read enabledPlugins from a settings.json. Returns null when the file is absent. */
function readEnabledPlugins(file: string): SettingsRead | null {
	if (!existsSync(file)) return null;
	try {
		const settings = JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
		const raw = settings.enabledPlugins;
		// Must be a plain object — reject arrays and non-objects to prevent confusing
		// "not found" failures when settings.json is malformed.
		const enabledPlugins =
			typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, boolean>) : {};
		return { enabledPlugins };
	} catch (e) {
		return { enabledPlugins: {}, unreadable: e instanceof Error ? e.message : "parse error" };
	}
}

function checkClaudePlugin(): CheckResult {
	if (!existsSync(CLAUDE_DIR)) {
		return { status: "skip", msg: "Plugin enabled         (Claude Code not installed)" };
	}
	// Claude Code merges user-level and project-level settings at runtime (project
	// takes precedence). Read both, or the check reports a false negative inside a
	// project that enables the plugin at project scope.
	const projectSettingsFile = join(process.cwd(), ".claude", "settings.json");
	const user = readEnabledPlugins(CLAUDE_SETTINGS_FILE);
	const project = readEnabledPlugins(projectSettingsFile);

	if (!user && !project) {
		return { status: "fail", msg: "Plugin enabled         settings.json not found — run 'elnora setup claude'" };
	}
	// Only surface "unreadable" when there's no usable settings at the other scope.
	if (user?.unreadable && !project?.enabledPlugins[PLUGIN_ID]) {
		return { status: "fail", msg: `Plugin enabled         settings.json unreadable (${user.unreadable})` };
	}

	const userEnabled = user?.enabledPlugins[PLUGIN_ID] === true;
	const projectEnabled = project?.enabledPlugins[PLUGIN_ID] === true;
	const isEnabled = userEnabled || projectEnabled;
	const scope = projectEnabled ? (userEnabled ? "user + project" : "project") : "user";

	const legacyKeys = [
		...new Set([...Object.keys(user?.enabledPlugins ?? {}), ...Object.keys(project?.enabledPlugins ?? {})]),
	].filter((k) => k.startsWith("elnora@") && k !== PLUGIN_ID);

	if (isEnabled && legacyKeys.length === 0) {
		return { status: "pass", msg: `Plugin enabled         ${PLUGIN_ID} (${scope} scope)` };
	}
	if (isEnabled && legacyKeys.length > 0) {
		return {
			status: "warn",
			msg: `Plugin enabled         ${PLUGIN_ID} (${scope} scope) — but stale legacy entries also present: ${legacyKeys.join(", ")}`,
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

/**
 * Whether the elnora marketplace has been *registered* (via `elnora setup
 * claude`) — distinct from whether Claude Code has *cloned* it yet. Registration
 * shows up as an enabledPlugins entry or extraKnownMarketplaces in user/project
 * settings, or in Claude Code's known_marketplaces.json once setup has run.
 */
function isMarketplaceRegistered(): boolean {
	for (const file of [CLAUDE_SETTINGS_FILE, join(process.cwd(), ".claude", "settings.json")]) {
		if (!existsSync(file)) continue;
		try {
			const settings = JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
			const enabled = settings.enabledPlugins;
			if (typeof enabled === "object" && enabled !== null && (enabled as Record<string, boolean>)[PLUGIN_ID] === true) {
				return true;
			}
			const extra = settings.extraKnownMarketplaces;
			if (extra != null && JSON.stringify(extra).includes(MARKETPLACE_NAME)) return true;
		} catch {
			/* unreadable settings — ignore, fall through */
		}
	}
	const knownMarketplaces = join(CLAUDE_DIR, "plugins", "known_marketplaces.json");
	if (existsSync(knownMarketplaces)) {
		try {
			if (JSON.stringify(JSON.parse(readFileSync(knownMarketplaces, "utf-8"))).includes(MARKETPLACE_NAME)) {
				return true;
			}
		} catch {
			/* ignore */
		}
	}
	return false;
}

function checkSkillsInstalled(): CheckResult {
	if (!existsSync(CLAUDE_DIR)) {
		return { status: "skip", msg: "Skills installed       (Claude Code not installed)" };
	}
	const skillsDir = join(CLAUDE_DIR, "plugins", "marketplaces", MARKETPLACE_NAME, "elnora", "skills");
	if (!existsSync(skillsDir)) {
		// Distinguish "registered but pre-first-launch" (expected, self-resolving)
		// from "never set up" (actionable) so customers stop chasing a non-problem.
		if (isMarketplaceRegistered()) {
			return {
				status: "warn",
				msg: "Skills installed       registered but not cloned yet — open this folder in Claude Code once to clone",
			};
		}
		return {
			status: "warn",
			msg: "Skills installed       marketplace not registered — run 'elnora setup claude'",
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
		return {
			status: "fail",
			msg: `Plugin version         plugin.json unreadable (${e instanceof Error ? e.message : "parse error"})`,
		};
	}
}

async function checkMcpReachable(): Promise<CheckResult> {
	const start = Date.now();
	const mcpHost = new URL(MCP_URL).hostname;
	try {
		const res = await fetch(MCP_URL, {
			method: "HEAD",
			signal: AbortSignal.timeout(5000),
		});
		const ms = Date.now() - start;
		// 401 is expected (not authenticated) — means server is up. Any 2xx-4xx is "server up".
		if (res.status < 500) {
			return { status: "pass", msg: `Server reachable       ${mcpHost} (${res.status}, ${ms}ms)` };
		}
		return { status: "fail", msg: `Server unreachable     ${mcpHost} (HTTP ${res.status})` };
	} catch (e) {
		return {
			status: "fail",
			msg: `Server unreachable     ${mcpHost} (${e instanceof Error ? e.message : "network error"})`,
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
			let skipped = 0;
			let failed = 0;
			let warnings = 0;
			const tally = (r: CheckResult) => {
				switch (r.status) {
					case "pass":
						passed++;
						break;
					case "warn":
						// A warning is non-fatal, so it still counts toward "passed",
						// but is surfaced separately in the summary.
						passed++;
						warnings++;
						break;
					case "skip":
						// `skip` means "not verified" (e.g. Claude Code never launched).
						// It must NOT count as a pass, or fresh machines falsely report
						// a clean bill of health.
						skipped++;
						break;
					case "fail":
						failed++;
						break;
				}
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
				await runCheck(() => checkShadowInstalls()),
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
			// Report passed / skipped / warnings / failed separately so the score
			// reflects what was actually verified and stays consistent across
			// platforms (skips no longer masquerade as passes).
			if (failed === 0 && warnings === 0 && skipped === 0) {
				console.error("All checks passed.");
			} else {
				const parts = [`${passed} passed`];
				if (skipped > 0) parts.push(`${skipped} skipped`);
				if (warnings > 0) parts.push(`${warnings} warning${warnings === 1 ? "" : "s"}`);
				if (failed > 0) parts.push(`${failed} failed`);
				console.error(`${parts.join(", ")}.`);
				if (failed > 0 && !existsSync(PROFILES_FILE)) console.error("\nRun: elnora auth login");
			}
		});
}
