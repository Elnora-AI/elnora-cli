import { describe, expect, test } from "vitest";
import { validateGuid, validatePage, validatePageSize, validatePathSegment } from "../../src/lib/validation.js";
import { ValidationError } from "../../src/lib/errors.js";

describe("validateGuid", () => {
	test("accepts valid UUID", () => {
		expect(validateGuid("bfdc6fbd-40ed-4042-9ea7-c79a5ec90085", "project_id")).toBe(
			"bfdc6fbd-40ed-4042-9ea7-c79a5ec90085",
		);
	});

	test("accepts uppercase UUID", () => {
		expect(validateGuid("BFDC6FBD-40ED-4042-9EA7-C79A5EC90085", "project_id")).toBe(
			"BFDC6FBD-40ED-4042-9EA7-C79A5EC90085",
		);
	});

	test("rejects invalid UUID", () => {
		expect(() => validateGuid("not-a-uuid", "project_id")).toThrow(ValidationError);
	});

	test("rejects empty string", () => {
		expect(() => validateGuid("", "project_id")).toThrow(ValidationError);
	});

	test("suggestion includes correct list command", () => {
		try {
			validateGuid("bad", "project_id");
		} catch (e) {
			expect((e as ValidationError).suggestion).toContain("elnora projects list");
		}
	});

	test("suggestion falls back for unknown labels", () => {
		try {
			validateGuid("bad", "widget");
		} catch (e) {
			expect((e as ValidationError).suggestion).toContain("elnora widgets list");
		}
	});
});

describe("validatePage", () => {
	test("accepts positive number", () => {
		expect(validatePage(1)).toBe(1);
		expect(validatePage(100)).toBe(100);
	});

	test("rejects zero", () => {
		expect(() => validatePage(0)).toThrow(ValidationError);
	});

	test("rejects negative", () => {
		expect(() => validatePage(-1)).toThrow(ValidationError);
	});
});

describe("validatePageSize", () => {
	test("accepts valid range", () => {
		expect(validatePageSize(1)).toBe(1);
		expect(validatePageSize(25)).toBe(25);
		expect(validatePageSize(100)).toBe(100);
	});

	test("rejects zero", () => {
		expect(() => validatePageSize(0)).toThrow(ValidationError);
	});

	test("rejects above max", () => {
		expect(() => validatePageSize(101)).toThrow(ValidationError);
	});
});

describe("validatePathSegment", () => {
	test("accepts alphanumeric with hyphens and underscores", () => {
		expect(validatePathSegment("my-path_segment", "label")).toBe("my-path_segment");
		expect(validatePathSegment("abc123", "label")).toBe("abc123");
	});

	test("rejects path traversal", () => {
		expect(() => validatePathSegment("../etc/passwd", "label")).toThrow(ValidationError);
	});

	test("rejects slashes", () => {
		expect(() => validatePathSegment("foo/bar", "label")).toThrow(ValidationError);
	});

	test("rejects empty", () => {
		expect(() => validatePathSegment("", "label")).toThrow(ValidationError);
	});

	test("rejects spaces", () => {
		expect(() => validatePathSegment("foo bar", "label")).toThrow(ValidationError);
	});
});
