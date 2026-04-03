import { afterEach, describe, expect, test } from "vitest";
import { ValidationError } from "../../src/lib/errors.js";
import { parseProfilesToml, resolveApiKey, serializeProfiles, validateProfileName } from "../../src/lib/profiles.js";

describe("validateProfileName", () => {
	test("accepts valid names", () => {
		expect(validateProfileName("default")).toBe("default");
		expect(validateProfileName("work")).toBe("work");
		expect(validateProfileName("lab-2")).toBe("lab-2");
		expect(validateProfileName("a")).toBe("a");
		expect(validateProfileName("0test")).toBe("0test");
	});

	test("rejects uppercase", () => {
		expect(() => validateProfileName("Work")).toThrow(ValidationError);
	});

	test("rejects starting with hyphen", () => {
		expect(() => validateProfileName("-bad")).toThrow(ValidationError);
	});

	test("rejects empty", () => {
		expect(() => validateProfileName("")).toThrow(ValidationError);
	});

	test("rejects too long (>32 chars)", () => {
		expect(() => validateProfileName("a".repeat(33))).toThrow(ValidationError);
	});

	test("rejects special characters", () => {
		expect(() => validateProfileName("foo_bar")).toThrow(ValidationError);
		expect(() => validateProfileName("foo.bar")).toThrow(ValidationError);
	});
});

describe("parseProfilesToml", () => {
	test("parses default section", () => {
		const toml = '[default]\napi_key = "elnora_live_test_key"';
		const result = parseProfilesToml(toml);
		expect(result.default.api_key).toBe("elnora_live_test_key");
	});

	test("parses named profiles", () => {
		const toml = '[profiles.university]\napi_key = "elnora_live_uni_key"';
		const result = parseProfilesToml(toml);
		expect(result.university.api_key).toBe("elnora_live_uni_key");
	});

	test("ignores comments and blank lines", () => {
		const toml = '# Comment\n\n[default]\napi_key = "key"';
		const result = parseProfilesToml(toml);
		expect(result.default.api_key).toBe("key");
	});

	test("handles multiple profiles", () => {
		const toml = '[default]\napi_key = "key1"\n\n[profiles.work]\napi_key = "key2"';
		const result = parseProfilesToml(toml);
		expect(Object.keys(result)).toEqual(["default", "work"]);
		expect(result.default.api_key).toBe("key1");
		expect(result.work.api_key).toBe("key2");
	});

	test("strips quotes from values", () => {
		const toml = "[default]\napi_key = 'single_quoted'";
		const result = parseProfilesToml(toml);
		expect(result.default.api_key).toBe("single_quoted");
	});

	test("ignores unknown sections", () => {
		const toml = '[unknown]\nkey = "val"\n\n[default]\napi_key = "key"';
		const result = parseProfilesToml(toml);
		expect(result).toEqual({ default: { api_key: "key" } });
	});

	test("returns empty object for empty input", () => {
		expect(parseProfilesToml("")).toEqual({});
	});
});

describe("serializeProfiles", () => {
	test("serializes default first, then sorted named profiles", () => {
		const profiles = {
			work: { api_key: "key2" },
			default: { api_key: "key1" },
			alpha: { api_key: "key3" },
		};
		const result = serializeProfiles(profiles);
		const defaultIdx = result.indexOf("[default]");
		const alphaIdx = result.indexOf("[profiles.alpha]");
		const workIdx = result.indexOf("[profiles.work]");
		expect(defaultIdx).toBeLessThan(alphaIdx);
		expect(alphaIdx).toBeLessThan(workIdx);
	});

	test("round-trips through parse", () => {
		const profiles = { default: { api_key: "test-key" }, lab: { api_key: "lab-key" } };
		const serialized = serializeProfiles(profiles);
		const parsed = parseProfilesToml(serialized);
		expect(parsed.default.api_key).toBe("test-key");
		expect(parsed.lab.api_key).toBe("lab-key");
	});

	test("includes header comments", () => {
		const result = serializeProfiles({ default: { api_key: "x" } });
		expect(result).toContain("# Elnora CLI profiles");
		expect(result).toContain("# Managed by: elnora auth login");
	});

	test("handles empty profiles", () => {
		const result = serializeProfiles({});
		expect(result).toContain("# Elnora CLI profiles");
	});
});

describe("resolveApiKey", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	test("prefers ELNORA_API_KEY env var", () => {
		process.env.ELNORA_API_KEY = "env_key_123";
		expect(resolveApiKey()).toBe("env_key_123");
	});

	test("falls back to ELNORA_MCP_API_KEY", () => {
		delete process.env.ELNORA_API_KEY;
		process.env.ELNORA_MCP_API_KEY = "mcp_key_456";
		expect(resolveApiKey()).toBe("mcp_key_456");
	});
});
