import { afterEach, describe, expect, test, vi } from "vitest";
import { ElnoraApiClient, validateApiUrl, validateUploadUrl } from "../../src/lib/client.js";
import { ElnoraError, NetworkError, ValidationError } from "../../src/lib/errors.js";

describe("SSRF protection — validateApiUrl", () => {
	test("accepts platform.elnora.ai", () => {
		expect(() => validateApiUrl("https://platform.elnora.ai/api/v1/projects")).not.toThrow();
	});

	test("accepts platform.elnora.ai with path and query", () => {
		expect(() => validateApiUrl("https://platform.elnora.ai/api/v1/tasks?page=1")).not.toThrow();
	});

	test("blocks non-HTTPS", () => {
		expect(() => validateApiUrl("http://platform.elnora.ai/api/v1/projects")).toThrow(ElnoraError);
	});

	test("blocks wrong hostname", () => {
		expect(() => validateApiUrl("https://evil.com/api/v1/projects")).toThrow(ElnoraError);
	});

	test("blocks localhost", () => {
		expect(() => validateApiUrl("https://localhost/api/v1/projects")).toThrow(ElnoraError);
	});

	test("blocks userinfo (@) in URL", () => {
		expect(() => validateApiUrl("https://user@platform.elnora.ai/api/v1/projects")).toThrow(ElnoraError);
	});

	test("error has SSRF_BLOCKED code", () => {
		try {
			validateApiUrl("https://evil.com/test");
			expect.unreachable();
		} catch (e) {
			expect((e as ElnoraError).code).toBe("SSRF_BLOCKED");
		}
	});
});

describe("Upload URL validation — validateUploadUrl", () => {
	test("accepts AWS S3 presigned URL", () => {
		expect(() => validateUploadUrl("https://bucket.s3.amazonaws.com/key?X-Amz-Signature=abc")).not.toThrow();
	});

	test("accepts GCS presigned URL", () => {
		expect(() => validateUploadUrl("https://storage.googleapis.com/bucket/key")).not.toThrow();
	});

	test("accepts Azure Blob presigned URL", () => {
		expect(() => validateUploadUrl("https://account.blob.core.windows.net/container/key")).not.toThrow();
	});

	test("blocks non-HTTPS upload URL", () => {
		expect(() => validateUploadUrl("http://bucket.s3.amazonaws.com/key")).toThrow(ValidationError);
	});

	test("blocks unknown host", () => {
		expect(() => validateUploadUrl("https://evil.com/upload")).toThrow(ValidationError);
	});

	test("blocks userinfo in upload URL", () => {
		expect(() => validateUploadUrl("https://user@bucket.s3.amazonaws.com/key")).toThrow(ValidationError);
	});

	test("allows userinfo in query string (not path)", () => {
		// @ in query string should be fine — only path/authority matters
		expect(() => validateUploadUrl("https://bucket.s3.amazonaws.com/key?email=user@example.com")).not.toThrow();
	});
});

describe("Network error mapping", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// A custom (non-production) baseUrl bypasses the SSRF allowlist so we can
	// drive a real fetch rejection without hitting the network.
	const client = new ElnoraApiClient("elnora_live_test_key", { baseUrl: "https://api.example.test/api/v1" });

	test("DNS failure surfaces host + underlying code + doctor pointer", async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
		}) as typeof fetch;

		await expect(client.get("/projects")).rejects.toMatchObject({
			code: "NETWORK_ERROR",
		});
		try {
			await client.get("/projects");
		} catch (e) {
			const err = e as NetworkError;
			expect(err).toBeInstanceOf(NetworkError);
			expect(err.message).toContain("api.example.test");
			expect(err.message).toContain("ENOTFOUND");
			expect(err.suggestion).toContain("elnora doctor");
		}
	});

	test("connection refused names the host", async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
		}) as typeof fetch;

		try {
			await client.get("/projects");
			throw new Error("expected NetworkError");
		} catch (e) {
			const err = e as NetworkError;
			expect(err).toBeInstanceOf(NetworkError);
			expect(err.message).toContain("ECONNREFUSED");
			expect(err.host).toBe("api.example.test");
		}
	});
});

describe("401 mapping", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const client = new ElnoraApiClient("elnora_live_test_key", { baseUrl: "https://api.example.test/api/v1" });

	function respond401() {
		globalThis.fetch = vi.fn(
			async () =>
				new Response(JSON.stringify({ errorCode: "UNAUTHORIZED", messages: ["Authentication required."] }), {
					status: 401,
				}),
		) as typeof fetch;
	}

	test("a non-GET 401 mentions the unroutable method", async () => {
		respond401();
		try {
			await client.patch("/tasks/x", { title: "t" });
			throw new Error("expected AuthError");
		} catch (e) {
			const err = e as ElnoraError;
			expect(err.code).toBe("AUTH_FAILED");
			expect(err.suggestion).toContain("PATCH");
			expect(err.suggestion).toContain("405");
		}
	});

	test("a GET 401 keeps the plain API-key suggestion", async () => {
		respond401();
		try {
			await client.get("/tasks/x");
			throw new Error("expected AuthError");
		} catch (e) {
			const err = e as ElnoraError;
			expect(err.code).toBe("AUTH_FAILED");
			expect(err.suggestion).not.toContain("405");
		}
	});
});
