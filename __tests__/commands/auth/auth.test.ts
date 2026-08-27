import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { registerAuthCommands } from "../../../src/commands/auth/index.js";
import { authLogin } from "../../../src/commands/auth/login.js";
import { authLogout } from "../../../src/commands/auth/logout.js";
import { authProfiles } from "../../../src/commands/auth/profiles.js";
import { authStatus } from "../../../src/commands/auth/status.js";
import { authValidate } from "../../../src/commands/auth/validate.js";
import type { CommandContext } from "../../../src/core/command.js";
import { AuthError, ValidationError } from "../../../src/lib/errors.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../src/lib/profiles.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../../src/lib/profiles.js")>();
	return {
		...actual,
		loadProfiles: vi.fn().mockReturnValue({
			default: { api_key: "elnora_live_abc123def456ghi789" },
			work: { api_key: "elnora_live_work_key_1234567890" },
		}),
		saveProfile: vi.fn().mockReturnValue("/home/user/.elnora/profiles.toml"),
		removeProfile: vi.fn().mockReturnValue(true),
		listProfileNames: vi.fn().mockReturnValue(["default", "work"]),
		validateProfileName: actual.validateProfileName,
		resolveApiKey: vi.fn().mockReturnValue("elnora_live_resolved_key_12345"),
	};
});

vi.mock("../../../src/lib/client.js", () => {
	const MockClient = vi.fn(function (this: Record<string, unknown>) {
		this.get = vi.fn().mockResolvedValue({ items: [], totalCount: 0 });
		this.post = vi.fn().mockResolvedValue({});
	});
	return { ElnoraApiClient: MockClient };
});

const { readStdinMock } = vi.hoisted(() => ({
	readStdinMock: vi.fn<() => Promise<string>>(() => Promise.resolve("")),
}));
vi.mock("../../../src/lib/stdin.js", () => ({ readStdin: readStdinMock }));

function mockContext(overrides?: { getResult?: unknown; postResult?: unknown }): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? {}),
			post: vi.fn().mockResolvedValue(overrides?.postResult ?? {}),
			patch: vi.fn().mockResolvedValue({}),
			put: vi.fn().mockResolvedValue({}),
			del: vi.fn().mockResolvedValue(undefined),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

// ---------------------------------------------------------------------------
// auth.login
// ---------------------------------------------------------------------------

describe("auth.login", () => {
	// Isolate from any real ELNORA_API_KEY in the environment, and default stdin
	// to non-TTY so the --api-key-stdin path is exercisable.
	let savedApi: string | undefined;
	let savedMcp: string | undefined;
	const origStdinTTY = process.stdin.isTTY;

	beforeEach(() => {
		savedApi = process.env.ELNORA_API_KEY;
		savedMcp = process.env.ELNORA_MCP_API_KEY;
		delete process.env.ELNORA_API_KEY;
		delete process.env.ELNORA_MCP_API_KEY;
		readStdinMock.mockReset();
		readStdinMock.mockResolvedValue("");
		Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
	});

	afterEach(() => {
		if (savedApi === undefined) delete process.env.ELNORA_API_KEY;
		else process.env.ELNORA_API_KEY = savedApi;
		if (savedMcp === undefined) delete process.env.ELNORA_MCP_API_KEY;
		else process.env.ELNORA_MCP_API_KEY = savedMcp;
		Object.defineProperty(process.stdin, "isTTY", { value: origStdinTTY, configurable: true });
	});

	test("has correct name and group", () => {
		expect(authLogin.name).toBe("auth.login");
		expect(authLogin.group).toBe("auth");
	});

	test("throws ValidationError when no apiKey provided", async () => {
		const ctx = mockContext();
		await expect(authLogin.execute({}, ctx)).rejects.toThrow(ValidationError);
	});

	test("defaults apiKeyStdin to false", () => {
		expect(authLogin.inputSchema.parse({}).apiKeyStdin).toBe(false);
	});

	test("--api-key-stdin reads the key from piped stdin and saves it", async () => {
		const { saveProfile } = await import("../../../src/lib/profiles.js");
		readStdinMock.mockResolvedValue("elnora_live_piped_key_1234567890\n");
		const ctx = mockContext();
		const result = await authLogin.execute(authLogin.inputSchema.parse({ apiKeyStdin: true }), ctx);
		expect(readStdinMock).toHaveBeenCalled();
		expect(saveProfile).toHaveBeenCalledWith("default", "elnora_live_piped_key_1234567890");
		expect(result).toMatchObject({ verified: true });
	});

	test("--api-key and --api-key-stdin together → ValidationError (no stdin read)", async () => {
		const ctx = mockContext();
		await expect(
			authLogin.execute(
				authLogin.inputSchema.parse({ apiKey: "elnora_live_flag_key_1234567890", apiKeyStdin: true }),
				ctx,
			),
		).rejects.toThrow(ValidationError);
		expect(readStdinMock).not.toHaveBeenCalled();
	});

	test("--api-key-stdin with a TTY stdin errors instead of hanging", async () => {
		Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
		const ctx = mockContext();
		await expect(authLogin.execute(authLogin.inputSchema.parse({ apiKeyStdin: true }), ctx)).rejects.toThrow(
			ValidationError,
		);
	});

	test("--api-key-stdin with empty input → ValidationError", async () => {
		readStdinMock.mockResolvedValue("   \n");
		const ctx = mockContext();
		await expect(authLogin.execute(authLogin.inputSchema.parse({ apiKeyStdin: true }), ctx)).rejects.toThrow(
			ValidationError,
		);
	});

	test("honors ELNORA_API_KEY when no flag/stdin key is given", async () => {
		const { saveProfile } = await import("../../../src/lib/profiles.js");
		process.env.ELNORA_API_KEY = "elnora_live_env_key_1234567890";
		const ctx = mockContext();
		const result = await authLogin.execute(authLogin.inputSchema.parse({}), ctx);
		expect(saveProfile).toHaveBeenCalledWith("default", "elnora_live_env_key_1234567890");
		expect(result).toMatchObject({ verified: true });
	});

	test("throws AuthError when key does not start with elnora_live_", async () => {
		const ctx = mockContext();
		await expect(authLogin.execute({ apiKey: "bad_key_1234567890123" }, ctx)).rejects.toThrow(AuthError);
	});

	test("throws AuthError when key is too short", async () => {
		const ctx = mockContext();
		await expect(authLogin.execute({ apiKey: "elnora_live_x" }, ctx)).rejects.toThrow(AuthError);
	});

	test("validates key format before making API call", async () => {
		const ctx = mockContext();
		const { ElnoraApiClient } = await import("../../../src/lib/client.js");
		(ElnoraApiClient as unknown as ReturnType<typeof vi.fn>).mockClear();

		await expect(authLogin.execute({ apiKey: "invalid_short" }, ctx)).rejects.toThrow(AuthError);

		expect(ElnoraApiClient).not.toHaveBeenCalled();
	});

	test("saves profile on successful verification", async () => {
		const { saveProfile } = await import("../../../src/lib/profiles.js");
		const ctx = mockContext();
		const result = await authLogin.execute({ apiKey: "elnora_live_test_key_1234567890", profile: "myprofile" }, ctx);
		expect(saveProfile).toHaveBeenCalledWith("myprofile", "elnora_live_test_key_1234567890");
		expect(result).toMatchObject({ profile: "myprofile", verified: true });
	});

	test("defaults profile to 'default'", () => {
		const parsed = authLogin.inputSchema.parse({});
		expect(parsed.profile).toBe("default");
	});

	test("formatOutput compact returns profile name", () => {
		expect(authLogin.formatOutput({ profile: "work", verified: true }, "compact")).toBe("work");
	});

	test("formatOutput json returns machine-readable JSON (guidance is on stderr)", () => {
		const output = { profile: "default", verified: true };
		const result = authLogin.formatOutput(output, "json");
		expect(JSON.parse(result)).toEqual(output);
	});
});

// ---------------------------------------------------------------------------
// auth.status
// ---------------------------------------------------------------------------

describe("auth.status", () => {
	test("has correct name and group", () => {
		expect(authStatus.name).toBe("auth.status");
		expect(authStatus.group).toBe("auth");
	});

	test("has readOnlyHint annotation", () => {
		expect(authStatus.annotations?.readOnlyHint).toBe(true);
	});

	test("probes GET /organizations and returns status", async () => {
		const ctx = mockContext({ getResult: { items: [{}, {}], totalCount: 5 } });
		const result = await authStatus.execute({}, ctx);
		// /projects was retired (ELN-880/881); organizations is the live auth probe.
		expect(ctx.client.get).toHaveBeenCalledWith("organizations");
		expect(result).toEqual({ profile: "default", authenticated: true, organizationCount: 5 });
	});

	test("counts a bare array response (the shape the API actually returns)", async () => {
		const ctx = mockContext({ getResult: [{}, {}, {}] });
		const result = await authStatus.execute({}, ctx);
		expect(result).toEqual({ profile: "default", authenticated: true, organizationCount: 3 });
	});

	test("falls back to items.length when totalCount missing", async () => {
		const ctx = mockContext({ getResult: { items: [{}, {}, {}] } });
		const result = await authStatus.execute({}, ctx);
		expect(result).toEqual({ profile: "default", authenticated: true, organizationCount: 3 });
	});

	test("returns 0 when no count info available", async () => {
		const ctx = mockContext({ getResult: {} });
		const result = await authStatus.execute({}, ctx);
		expect(result).toEqual({ profile: "default", authenticated: true, organizationCount: 0 });
	});

	test("formatOutput compact returns authenticated boolean", () => {
		expect(authStatus.formatOutput({ authenticated: true }, "compact")).toBe("true");
	});
});

// ---------------------------------------------------------------------------
// auth.logout
// ---------------------------------------------------------------------------

describe("auth.logout", () => {
	test("has correct name and group", () => {
		expect(authLogout.name).toBe("auth.logout");
		expect(authLogout.group).toBe("auth");
	});

	test("has destructiveHint annotation", () => {
		expect(authLogout.annotations?.destructiveHint).toBe(true);
	});

	test("removes a single profile by name", async () => {
		const { removeProfile } = await import("../../../src/lib/profiles.js");
		const ctx = mockContext();
		const result = await authLogout.execute({ profile: "work" }, ctx);
		expect(removeProfile).toHaveBeenCalledWith("work");
		expect(result).toMatchObject({ loggedOut: true, profile: "work" });
	});

	test("defaults profile to 'default'", async () => {
		const { removeProfile } = await import("../../../src/lib/profiles.js");
		const ctx = mockContext();
		const result = await authLogout.execute({}, ctx);
		expect(removeProfile).toHaveBeenCalledWith("default");
		expect(result).toMatchObject({ loggedOut: true, profile: "default" });
	});

	test("removes all profiles when all=true", async () => {
		const { removeProfile, listProfileNames } = await import("../../../src/lib/profiles.js");
		const ctx = mockContext();
		const result = await authLogout.execute({ all: true }, ctx);
		expect(listProfileNames).toHaveBeenCalled();
		expect(removeProfile).toHaveBeenCalledWith("default");
		expect(removeProfile).toHaveBeenCalledWith("work");
		expect(result).toMatchObject({ loggedOut: true, profile: "all", removedCount: 2 });
	});

	test("formatOutput compact returns profile", () => {
		expect(authLogout.formatOutput({ loggedOut: true, profile: "work" }, "compact")).toBe("work");
	});
});

// ---------------------------------------------------------------------------
// auth.profiles
// ---------------------------------------------------------------------------

describe("auth.profiles", () => {
	test("has correct name and group", () => {
		expect(authProfiles.name).toBe("auth.profiles");
		expect(authProfiles.group).toBe("auth");
	});

	test("has readOnlyHint annotation", () => {
		expect(authProfiles.annotations?.readOnlyHint).toBe(true);
	});

	test("loads and masks API keys", async () => {
		const ctx = mockContext();
		const result = (await authProfiles.execute({}, ctx)) as {
			profiles: { name: string; apiKey: string }[];
		};
		expect(result.profiles).toHaveLength(2);

		const defaultProfile = result.profiles.find((p) => p.name === "default");
		expect(defaultProfile).toBeDefined();
		expect(defaultProfile?.apiKey).toBe("elnora_live_...i789");
		expect(defaultProfile?.apiKey).not.toContain("abc123def456");

		const workProfile = result.profiles.find((p) => p.name === "work");
		expect(workProfile).toBeDefined();
		expect(workProfile?.apiKey).toBe("elnora_live_...7890");
	});

	test("does not call ctx.client (local-only operation)", async () => {
		const ctx = mockContext();
		await authProfiles.execute({}, ctx);
		expect(ctx.client.get).not.toHaveBeenCalled();
		expect(ctx.client.post).not.toHaveBeenCalled();
	});

	test("formatOutput compact returns comma-separated names", () => {
		const output = {
			profiles: [
				{ name: "default", apiKey: "x" },
				{ name: "work", apiKey: "y" },
			],
		};
		expect(authProfiles.formatOutput(output, "compact")).toBe("default, work");
	});

	test("formatOutput json returns pretty JSON", () => {
		const output = { profiles: [] };
		expect(authProfiles.formatOutput(output, "json")).toBe(JSON.stringify(output, null, 2));
	});
});

// ---------------------------------------------------------------------------
// auth.validate
// ---------------------------------------------------------------------------

describe("auth.validate", () => {
	test("has correct name and group", () => {
		expect(authValidate.name).toBe("auth.validate");
		expect(authValidate.group).toBe("auth");
	});

	test("calls POST auth_validate with provided token", async () => {
		const ctx = mockContext({ postResult: { valid: true, type: "api_key" } });
		const result = await authValidate.execute({ token: "my_token_123" }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("auth_validate", { token: "my_token_123" });
		expect(result).toEqual({ valid: true, type: "api_key" });
	});

	test("resolves API key from profiles when no token provided", async () => {
		const ctx = mockContext({ postResult: { valid: true } });
		await authValidate.execute({}, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("auth_validate", {
			token: "elnora_live_resolved_key_12345",
		});
	});

	test("formatOutput compact returns JSON string", () => {
		const output = { valid: true };
		expect(authValidate.formatOutput(output, "compact")).toBe(JSON.stringify(output));
	});
});

// ---------------------------------------------------------------------------
// registerAuthCommands
// ---------------------------------------------------------------------------

describe("registerAuthCommands", () => {
	test("returns all 5 auth commands", () => {
		const commands = registerAuthCommands();
		expect(commands).toHaveLength(5);
	});

	test("all commands belong to auth group", () => {
		const commands = registerAuthCommands();
		for (const cmd of commands) {
			expect(cmd.group).toBe("auth");
		}
	});

	test("all command names start with auth.", () => {
		const commands = registerAuthCommands();
		for (const cmd of commands) {
			expect(cmd.name).toMatch(/^auth\./);
		}
	});

	test("command names are unique", () => {
		const commands = registerAuthCommands();
		const names = commands.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
