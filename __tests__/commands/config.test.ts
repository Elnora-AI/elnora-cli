import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { loadProfilesMock } = vi.hoisted(() => ({
	loadProfilesMock: vi.fn<() => Record<string, { api_key?: string }>>(() => ({})),
}));
vi.mock("../../src/lib/profiles.js", () => ({ loadProfiles: loadProfilesMock }));

const { addConfigCommand } = await import("../../src/commands/config.js");
const { BASE_URL, AI_SERVER_URL, MCP_URL } = await import("../../src/lib/config.js");

function captureStdout() {
	const lines: string[] = [];
	const spy = vi.spyOn(console, "log").mockImplementation((msg?: unknown) => {
		lines.push(typeof msg === "string" ? msg : String(msg));
	});
	return { get: () => lines.join("\n"), restore: () => spy.mockRestore() };
}

function buildTestProgram(): Command {
	const p = new Command();
	p.option("--json", "Force JSON output", false).option("--profile <name>", "Named profile");
	addConfigCommand(p);
	return p;
}

describe("config show", () => {
	let savedApi: string | undefined;
	let savedMcp: string | undefined;
	const origTTY = process.stdout.isTTY;

	beforeEach(() => {
		savedApi = process.env.ELNORA_API_KEY;
		savedMcp = process.env.ELNORA_MCP_API_KEY;
		delete process.env.ELNORA_API_KEY;
		delete process.env.ELNORA_MCP_API_KEY;
		loadProfilesMock.mockReturnValue({});
		// Default to a terminal so the human key=value path is exercised; the
		// piped-JSON behavior gets its own test.
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (savedApi === undefined) delete process.env.ELNORA_API_KEY;
		else process.env.ELNORA_API_KEY = savedApi;
		if (savedMcp === undefined) delete process.env.ELNORA_MCP_API_KEY;
		else process.env.ELNORA_MCP_API_KEY = savedMcp;
		Object.defineProperty(process.stdout, "isTTY", { value: origTTY, configurable: true });
	});

	test("prints stable key=value with resolved endpoints", async () => {
		const cap = captureStdout();
		await buildTestProgram().parseAsync(["node", "elnora", "config", "show"]);
		const out = cap.get();
		expect(out).toContain(`base_url=${BASE_URL}`);
		expect(out).toContain(`ai_server_url=${AI_SERVER_URL}`);
		expect(out).toContain(`mcp_url=${MCP_URL}`);
		expect(out).toContain("active_profile=default");
		expect(out).toContain("key_source=none");
		cap.restore();
	});

	test("--json emits the same fields as JSON", async () => {
		const cap = captureStdout();
		await buildTestProgram().parseAsync(["node", "elnora", "--json", "config", "show"]);
		const parsed = JSON.parse(cap.get());
		expect(parsed.base_url).toBe(BASE_URL);
		expect(parsed.mcp_url).toBe(MCP_URL);
		expect(parsed.active_profile).toBe("default");
		expect(parsed.key_source).toBe("none");
		cap.restore();
	});

	test("key_source: env wins over profile", async () => {
		process.env.ELNORA_API_KEY = "elnora_live_env";
		loadProfilesMock.mockReturnValue({ default: { api_key: "elnora_live_profile" } });
		const cap = captureStdout();
		await buildTestProgram().parseAsync(["node", "elnora", "config", "show"]);
		expect(cap.get()).toContain("key_source=env:ELNORA_API_KEY");
		cap.restore();
	});

	test("key_source: profile when no env key", async () => {
		loadProfilesMock.mockReturnValue({ default: { api_key: "elnora_live_profile" } });
		const cap = captureStdout();
		await buildTestProgram().parseAsync(["node", "elnora", "config", "show"]);
		expect(cap.get()).toContain("key_source=profile:default");
		cap.restore();
	});

	test("honors --profile for active_profile and key source", async () => {
		loadProfilesMock.mockReturnValue({ work: { api_key: "elnora_live_work" } });
		const cap = captureStdout();
		await buildTestProgram().parseAsync(["node", "elnora", "--profile", "work", "config", "show"]);
		const out = cap.get();
		expect(out).toContain("active_profile=work");
		expect(out).toContain("key_source=profile:work");
		cap.restore();
	});

	test("never prints the raw key value", async () => {
		process.env.ELNORA_API_KEY = "elnora_live_supersecret_value";
		const cap = captureStdout();
		await buildTestProgram().parseAsync(["node", "elnora", "config", "show"]);
		expect(cap.get()).not.toContain("supersecret");
		cap.restore();
	});

	test("emits JSON when piped/redirected (non-TTY), no flag required", async () => {
		Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
		const cap = captureStdout();
		await buildTestProgram().parseAsync(["node", "elnora", "config", "show"]);
		const parsed = JSON.parse(cap.get());
		expect(parsed.base_url).toBe(BASE_URL);
		expect(parsed.active_profile).toBe("default");
		cap.restore();
	});
});
