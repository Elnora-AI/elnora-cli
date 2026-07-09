import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
	AuthError,
	ElnoraError,
	EXIT_CODES,
	formatErrorPayload,
	getExitCode,
	NetworkError,
	NotFoundError,
	RateLimitError,
	ServerError,
	scrub,
	scrubData,
	toValidationError,
	ValidationError,
} from "../../src/lib/errors.js";

describe("Error hierarchy", () => {
	test("ElnoraError has code and suggestion", () => {
		const err = new ElnoraError("test", { code: "TEST", suggestion: "try again" });
		expect(err.message).toBe("test");
		expect(err.code).toBe("TEST");
		expect(err.suggestion).toBe("try again");
		expect(err).toBeInstanceOf(Error);
	});

	test("ElnoraError has default code", () => {
		const err = new ElnoraError("test");
		expect(err.code).toBe("ELNORA_ERROR");
		expect(err.suggestion).toBeUndefined();
	});

	test("AuthError has default message and exit code 3", () => {
		const err = new AuthError();
		expect(err.code).toBe("AUTH_FAILED");
		expect(err.message).toContain("API key");
		expect(err.suggestion).toContain("platform.elnora.ai");
		expect(EXIT_CODES.get(AuthError)).toBe(3);
	});

	test("AuthError accepts custom message", () => {
		const err = new AuthError("Custom auth error");
		expect(err.message).toBe("Custom auth error");
	});

	test("NotFoundError includes entity and identifier", () => {
		const err = new NotFoundError("project", "abc-123");
		expect(err.message).toContain("project");
		expect(err.message).toContain("abc-123");
		expect(err.code).toBe("NOT_FOUND");
		expect(EXIT_CODES.get(NotFoundError)).toBe(4);
	});

	test("RateLimitError has exit code 5", () => {
		const err = new RateLimitError();
		expect(err.code).toBe("RATE_LIMITED");
		expect(EXIT_CODES.get(RateLimitError)).toBe(5);
	});

	test("ValidationError has exit code 2", () => {
		const err = new ValidationError("bad input");
		expect(err.code).toBe("VALIDATION_ERROR");
		expect(EXIT_CODES.get(ValidationError)).toBe(2);
	});

	test("ServerError has exit code 6", () => {
		const err = new ServerError();
		expect(err.code).toBe("SERVER_ERROR");
		expect(EXIT_CODES.get(ServerError)).toBe(6);
	});

	test("NetworkError includes host, cause, and a doctor pointer", () => {
		const err = new NetworkError("platform.elnora.ai", "ENOTFOUND");
		expect(err.code).toBe("NETWORK_ERROR");
		expect(err.message).toContain("platform.elnora.ai");
		expect(err.message).toContain("ENOTFOUND");
		expect(err.suggestion).toContain("elnora doctor");
		expect(err.suggestion).toContain("platform.elnora.ai");
		expect(err.host).toBe("platform.elnora.ai");
	});

	test("NetworkError without a host still points at doctor", () => {
		const err = new NetworkError();
		expect(err.code).toBe("NETWORK_ERROR");
		expect(err.suggestion).toContain("elnora doctor");
		expect(err.host).toBeUndefined();
	});
});

describe("getExitCode", () => {
	test("returns typed exit code for known errors", () => {
		expect(getExitCode(new AuthError())).toBe(3);
		expect(getExitCode(new NotFoundError("x", "y"))).toBe(4);
		expect(getExitCode(new ValidationError("x"))).toBe(2);
		expect(getExitCode(new RateLimitError())).toBe(5);
		expect(getExitCode(new ServerError())).toBe(6);
	});

	test("returns 1 for unknown errors", () => {
		expect(getExitCode(new Error("generic"))).toBe(1);
		expect(getExitCode(new ElnoraError("base"))).toBe(1);
	});
});

describe("toValidationError", () => {
	test("turns a ZodError into a one-line ValidationError (field: message), exit 2", () => {
		const schema = z.object({ pageSize: z.number().max(100) });
		let caught: unknown;
		try {
			schema.parse({ pageSize: 999 });
		} catch (e) {
			caught = e;
		}
		const err = toValidationError(caught);
		expect(err).toBeInstanceOf(ValidationError);
		expect(err.message).toContain("pageSize");
		expect(getExitCode(err)).toBe(2);
		// Must NOT be raw serialized ZodError JSON.
		expect(err.message).not.toContain("invalid_format");
		expect(err.message).not.toMatch(/^\[/);
	});

	test("summarizes multiple issues with a count", () => {
		const schema = z.object({ a: z.string(), b: z.string() });
		let caught: unknown;
		try {
			schema.parse({});
		} catch (e) {
			caught = e;
		}
		const err = toValidationError(caught);
		expect(err.message).toMatch(/\+\d+ more/);
	});

	test("passes non-Zod errors through unchanged", () => {
		const original = new AuthError("nope");
		expect(toValidationError(original)).toBe(original);
	});

	test("wraps non-Error values", () => {
		const err = toValidationError("boom");
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toBe("boom");
	});
});

describe("formatErrorPayload", () => {
	test("formats ElnoraError with code and suggestion", () => {
		const err = new AuthError();
		const payload = formatErrorPayload(err);
		expect(payload.code).toBe("AUTH_FAILED");
		expect(payload.suggestion).toBeDefined();
		expect(payload.error).toBeDefined();
	});

	test("formats generic Error with constructor name", () => {
		const payload = formatErrorPayload(new TypeError("oops"));
		expect(payload.code).toBe("TypeError");
		expect(payload.error).toBe("oops");
	});
});

describe("Credential scrubbing", () => {
	test("scrubs elnora_live_ tokens", () => {
		const input = "key is elnora_live_orgA_abcdefgh12345678";
		expect(scrub(input)).toBe("key is [REDACTED]");
	});

	test("scrubs long token-like strings (40+ chars with digits)", () => {
		const longToken = "abc123def456ghi789jkl012mno345pqr678stu901";
		expect(scrub(`token: ${longToken}`)).toBe("token: [REDACTED]");
	});

	test("does not scrub long pure-letter strings (e.g. biological sequences)", () => {
		const dna = "ATGAGCATGCTGTTTTACACCCTGATCACCGCATTTCTGATTGGCATT";
		expect(scrub(`sequence: ${dna}`)).toBe(`sequence: ${dna}`);
		const protein = "MSMLFYTLITAFLIGIQAEPLWNSIEQLQSMETSQVQGSGSAGQNIK";
		expect(scrub(`peptide: ${protein}`)).toBe(`peptide: ${protein}`);
	});

	test("scrubs key=value patterns", () => {
		const input = 'api_key = "elnora_live_secret123456"';
		expect(scrub(input)).toBe("[REDACTED]");
	});

	test("does not scrub short strings", () => {
		expect(scrub("hello world")).toBe("hello world");
	});

	test("scrubData recursively scrubs objects", () => {
		const data = {
			name: "test",
			key: "elnora_live_orgA_abcdefgh12345678",
			nested: { token: "elnora_live_secret_abcdefgh" },
			list: ["safe", "elnora_live_another_token1234"],
		};
		const result = scrubData(data) as Record<string, unknown>;
		expect(result.name).toBe("test");
		expect(result.key).toBe("[REDACTED]");
		expect((result.nested as Record<string, string>).token).toBe("[REDACTED]");
		expect((result.list as string[])[0]).toBe("safe");
		expect((result.list as string[])[1]).toBe("[REDACTED]");
	});

	test("scrubData handles primitives", () => {
		expect(scrubData(42)).toBe(42);
		expect(scrubData(null)).toBe(null);
		expect(scrubData(true)).toBe(true);
	});
});
