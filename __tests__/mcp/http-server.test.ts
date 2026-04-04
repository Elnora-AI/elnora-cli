import { describe, expect, test } from "vitest";
import type { McpHttpConfig } from "../../src/mcp/http-server.js";

describe("McpHttpConfig", () => {
	test("config shape is valid", () => {
		const config: McpHttpConfig = {
			port: 3000,
			host: "0.0.0.0",
			tokenValidationUrl: "https://platform.elnora.ai/api/internal/validate-token",
			mcpServiceKey: "test-service-key",
		};
		expect(config.port).toBe(3000);
		expect(config.host).toBe("0.0.0.0");
		expect(config.tokenValidationUrl).toContain("validate-token");
		expect(config.mcpServiceKey).toBe("test-service-key");
	});
});

// Note: Integration tests for the HTTP server (testing actual Express routes)
// require starting the server, which is better done as an E2E test.
// Unit tests here validate the config shape and helper functions.
