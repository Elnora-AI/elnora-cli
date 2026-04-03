import { describe, expect, test } from "vitest";
import { BASE_URL, buildUrl, DEFAULT_PAGE_SIZE, ENDPOINTS, MAX_PAGE_SIZE } from "../../src/lib/config.js";

describe("config constants", () => {
	test("BASE_URL is platform.elnora.ai", () => {
		expect(BASE_URL).toBe("https://platform.elnora.ai/api/v1");
	});

	test("ENDPOINTS has projects endpoint", () => {
		expect(ENDPOINTS.projects).toBe("/projects");
	});

	test("ENDPOINTS has task_messages endpoint", () => {
		expect(ENDPOINTS.task_messages).toBe("/tasks/{id}/messages");
	});

	test("MAX_PAGE_SIZE is 100", () => {
		expect(MAX_PAGE_SIZE).toBe(100);
	});

	test("DEFAULT_PAGE_SIZE is 25", () => {
		expect(DEFAULT_PAGE_SIZE).toBe(25);
	});
});

describe("buildUrl", () => {
	test("replaces single template variable", () => {
		expect(buildUrl("project", { id: "abc-123" })).toBe("https://platform.elnora.ai/api/v1/projects/abc-123");
	});

	test("replaces multiple template variables", () => {
		expect(buildUrl("project_member_role", { id: "proj-1", uid: "user-2" })).toBe(
			"https://platform.elnora.ai/api/v1/projects/proj-1/members/user-2/role",
		);
	});

	test("works without params for parameterless endpoints", () => {
		expect(buildUrl("projects")).toBe("https://platform.elnora.ai/api/v1/projects");
	});

	test("accepts custom base URL", () => {
		expect(buildUrl("projects", undefined, "https://staging.elnora.ai/api/v1")).toBe(
			"https://staging.elnora.ai/api/v1/projects",
		);
	});

	test("throws for unknown endpoint", () => {
		expect(() => buildUrl("nonexistent")).toThrow("Unknown endpoint: nonexistent");
	});
});
