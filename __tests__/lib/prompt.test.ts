import { describe, expect, test, vi } from "vitest";

describe("promptSecret", () => {
	test("module exports promptSecret function", async () => {
		const mod = await import("../../src/lib/prompt.js");
		expect(typeof mod.promptSecret).toBe("function");
	});

	test("resolves with input on Enter in non-TTY mode", async () => {
		const { Readable } = await import("node:stream");

		// Save originals
		const origStdin = process.stdin;
		const origIsTTY = process.stdin.isTTY;

		// Create a readable stream that emits a line
		const mockStdin = new Readable({
			read() {
				this.push("elnora_live_test_key_12345\n");
				this.push(null);
			},
		});
		Object.defineProperty(mockStdin, "isTTY", { value: false });

		// Replace stdin temporarily
		Object.defineProperty(process, "stdin", { value: mockStdin, writable: true });

		const { promptSecret } = await import("../../src/lib/prompt.js");
		const result = await promptSecret("API key: ");

		// Restore
		Object.defineProperty(process, "stdin", { value: origStdin, writable: true });

		expect(result).toBe("elnora_live_test_key_12345");
	});

	test("trims whitespace from input", async () => {
		const { Readable } = await import("node:stream");

		const origStdin = process.stdin;

		const mockStdin = new Readable({
			read() {
				this.push("  elnora_live_padded_key_12345  \n");
				this.push(null);
			},
		});
		Object.defineProperty(mockStdin, "isTTY", { value: false });
		Object.defineProperty(process, "stdin", { value: mockStdin, writable: true });

		const { promptSecret } = await import("../../src/lib/prompt.js");
		const result = await promptSecret("API key: ");

		Object.defineProperty(process, "stdin", { value: origStdin, writable: true });

		expect(result).toBe("elnora_live_padded_key_12345");
	});
});
