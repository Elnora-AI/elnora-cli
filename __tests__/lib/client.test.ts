import { describe, expect, test } from "vitest";
import { validateApiUrl, validateUploadUrl } from "../../src/lib/client.js";
import { ElnoraError, ValidationError } from "../../src/lib/errors.js";

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
