import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock homedir so all path constants in common.ts resolve under TEST_HOME
const TEST_HOME = mkdtempSync(join(tmpdir(), "elnora-doctor-test-"));
vi.mock("node:os", async () => {
	const actual = await vi.importActual<typeof import("node:os")>("node:os");
	return { ...actual, homedir: () => TEST_HOME };
});

// Dynamic import after mock so constants are built with mocked homedir
const { addDoctorCommand } = await import("../../src/commands/doctor.js");
const { VERSION } = await import("../../src/lib/config.js");

// Helper to capture console.error output
function captureStderr() {
	const lines: string[] = [];
	const spy = vi.spyOn(console, "error").mockImplementation((msg?: unknown) => {
		lines.push(typeof msg === "string" ? msg : String(msg));
	});
	return {
		getOutput: () => lines.join("\n"),
		restore: () => spy.mockRestore(),
	};
}

// Helper to install a default successful fetch mock.
// Matches by parsed URL hostname (not substring) to avoid CodeQL's
// "Incomplete URL substring sanitization" false positive — even in test
// code we shouldn't use url.includes("hostname"), because a malicious URL
// could contain the hostname as a substring elsewhere in the URL.
function installFetchMock(overrides?: Record<string, { status: number; body?: unknown }>) {
	globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
		const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
		const parsed = new URL(rawUrl);
		const host = parsed.hostname;

		if (overrides) {
			for (const [overrideHost, spec] of Object.entries(overrides)) {
				if (host === overrideHost) {
					return new Response(spec.body != null ? JSON.stringify(spec.body) : "", { status: spec.status });
				}
			}
		}

		if (host === "platform.elnora.ai" && parsed.pathname.endsWith("/health")) {
			return new Response("{}", { status: 200 });
		}
		if (host === "registry.npmjs.org") {
			return new Response(JSON.stringify({ version: "1.3.5" }), { status: 200 });
		}
		if (host === "mcp.elnora.ai") {
			return new Response("", { status: 401 });
		}
		if (parsed.pathname.endsWith("/ai-server/health") || parsed.pathname.endsWith("/api/v1/health")) {
			return new Response("{}", { status: 200 });
		}
		return new Response("{}", { status: 200 });
	}) as typeof fetch;
}

describe("elnora doctor", () => {
	beforeEach(() => {
		installFetchMock();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		try {
			rmSync(TEST_HOME, { recursive: true, force: true });
			mkdirSync(TEST_HOME, { recursive: true });
		} catch {
			// ignore
		}
	});

	test("renders three sections (CLI, Claude Code, MCP)", async () => {
		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		expect(output).toContain("CLI");
		expect(output).toContain("Claude Code");
		expect(output).toContain("MCP");
		capture.restore();
	});

	test("skips Claude Code checks when ~/.claude/ missing", async () => {
		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		// All three Claude Code checks should skip
		expect(output).toContain("(Claude Code not installed)");
		capture.restore();
	});

	test("passes plugin and skills checks when properly installed", async () => {
		// Pre-populate a fully-installed Claude Code + elnora plugin state
		const claude = join(TEST_HOME, ".claude");
		mkdirSync(join(claude, "plugins", "marketplaces", "elnora-plugins", "elnora", ".claude-plugin"), {
			recursive: true,
		});
		const skillsRoot = join(claude, "plugins", "marketplaces", "elnora-plugins", "elnora", "skills");
		for (const s of [
			"elnora-admin",
			"elnora-agent",
			"elnora-files",
			"elnora-folders",
			"elnora-orgs",
			"elnora-platform",
			"elnora-projects",
			"elnora-search",
			"elnora-tasks",
		]) {
			mkdirSync(join(skillsRoot, s), { recursive: true });
			writeFileSync(join(skillsRoot, s, "SKILL.md"), "---\nname: x\n---\n");
		}
		writeFileSync(join(claude, "settings.json"), JSON.stringify({ enabledPlugins: { "elnora@elnora-plugins": true } }));
		writeFileSync(
			join(claude, "plugins", "marketplaces", "elnora-plugins", "elnora", ".claude-plugin", "plugin.json"),
			// Match the CLI version so the "Plugin version" check reports (matches CLI).
			// Using VERSION dynamically keeps the test valid across release-please bumps.
			JSON.stringify({ version: VERSION }),
		);

		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		// Verify the Claude Code section reports clean results
		expect(output).toMatch(/✓[^\n]*Plugin enabled.*elnora@elnora-plugins/);
		expect(output).toMatch(/✓[^\n]*Skills installed.*9 skills/);
		const versionPattern = new RegExp(`✓[^\\n]*Plugin version.*v${VERSION.replace(/\./g, "\\.")} \\(matches CLI\\)`);
		expect(output).toMatch(versionPattern);
		capture.restore();
	});

	test("fails plugin check when settings.json has legacy entry only", async () => {
		const claude = join(TEST_HOME, ".claude");
		mkdirSync(claude, { recursive: true });
		writeFileSync(join(claude, "settings.json"), JSON.stringify({ enabledPlugins: { "elnora@elnora-ai": true } }));

		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		// Should fail with a hint about legacy entries
		expect(output).toMatch(/✗[^\n]*Plugin enabled.*legacy/);
		expect(output).toContain("elnora@elnora-ai");
		capture.restore();
	});

	test("warns when plugin version differs from CLI version", async () => {
		const claude = join(TEST_HOME, ".claude");
		mkdirSync(join(claude, "plugins", "marketplaces", "elnora-plugins", "elnora", ".claude-plugin"), {
			recursive: true,
		});
		const skillsRoot = join(claude, "plugins", "marketplaces", "elnora-plugins", "elnora", "skills");
		for (const s of [
			"elnora-admin",
			"elnora-agent",
			"elnora-files",
			"elnora-folders",
			"elnora-orgs",
			"elnora-platform",
			"elnora-projects",
			"elnora-search",
			"elnora-tasks",
		]) {
			mkdirSync(join(skillsRoot, s), { recursive: true });
			writeFileSync(join(skillsRoot, s, "SKILL.md"), "---\nname: x\n---\n");
		}
		writeFileSync(join(claude, "settings.json"), JSON.stringify({ enabledPlugins: { "elnora@elnora-plugins": true } }));
		writeFileSync(
			join(claude, "plugins", "marketplaces", "elnora-plugins", "elnora", ".claude-plugin", "plugin.json"),
			JSON.stringify({ version: "1.2.0" }),
		);

		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		expect(output).toMatch(/![^\n]*Plugin version.*v1\.2\.0.*restart Claude Code/);
		capture.restore();
	});

	test("warns when marketplace enabled but not cloned yet", async () => {
		const claude = join(TEST_HOME, ".claude");
		mkdirSync(claude, { recursive: true });
		writeFileSync(join(claude, "settings.json"), JSON.stringify({ enabledPlugins: { "elnora@elnora-plugins": true } }));

		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		// Plugin enabled but skills dir missing → skills check warns
		expect(output).toMatch(/![^\n]*Skills installed.*not cloned yet/);
		capture.restore();
	});

	test("passes MCP check on 401 (server up, unauthenticated)", async () => {
		installFetchMock({ "mcp.elnora.ai": { status: 401 } });
		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		expect(output).toMatch(/✓[^\n]*Server reachable.*mcp\.elnora\.ai \(401/);
		capture.restore();
	});

	test("fails MCP check on 500", async () => {
		installFetchMock({ "mcp.elnora.ai": { status: 503 } });
		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		expect(output).toMatch(/✗[^\n]*Server unreachable.*503/);
		capture.restore();
	});

	test("PATH check warns when neither install dir in PATH", async () => {
		const origPath = process.env.PATH;
		process.env.PATH = "/usr/local/bin:/usr/bin:/bin";
		try {
			const capture = captureStderr();
			const program = new Command();
			addDoctorCommand(program);
			await program.parseAsync(["node", "elnora", "doctor"]);
			const output = capture.getOutput();
			expect(output).toMatch(/![^\n]*PATH configured.*standard install dirs not in PATH/);
			capture.restore();
		} finally {
			process.env.PATH = origPath;
		}
	});

	test("summary line reflects pass/fail/warn counts", async () => {
		installFetchMock({ "mcp.elnora.ai": { status: 503 } });
		const capture = captureStderr();
		const program = new Command();
		addDoctorCommand(program);
		await program.parseAsync(["node", "elnora", "doctor"]);
		const output = capture.getOutput();
		// Summary line format: "N/10 checks passed — N failed." or with warning suffix
		// "N/10 checks passed — N failed (N warning(s))." — auth will also fail in test env.
		expect(output).toMatch(/\/10 checks passed — \d+ failed/);
		capture.restore();
	});
});
