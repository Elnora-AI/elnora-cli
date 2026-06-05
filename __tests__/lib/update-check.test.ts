import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Force a known install method so we can assert the routed command.
vi.mock("../../src/lib/install-method.js", () => ({
	detectInstallMethod: vi.fn(() => "binary"),
	getUpdateInstruction: vi.fn((m: string) =>
		m === "npm"
			? "npm install -g @elnora-ai/cli@latest"
			: m === "homebrew"
				? "brew upgrade elnora"
				: "elnora update --install",
	),
}));

const { showUpdateNotice } = await import("../../src/lib/update-check.js");

describe("showUpdateNotice", () => {
	let writes: string[];
	let writeSpy: ReturnType<typeof vi.spyOn>;
	const origIsTTY = process.stderr.isTTY;

	beforeEach(() => {
		writes = [];
		Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });
		writeSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
			writes.push(String(chunk));
			return true;
		});
	});

	afterEach(() => {
		writeSpy.mockRestore();
		Object.defineProperty(process.stderr, "isTTY", { value: origIsTTY, configurable: true });
	});

	test("advertises the install-method-specific command, not bare 'elnora update'", () => {
		showUpdateNotice("9.9.9");
		const out = writes.join("");
		expect(out).toContain("Update available");
		expect(out).toContain("Run: elnora update --install");
		// Regression guard: the original bug advertised the check-only command.
		expect(out).not.toMatch(/Run: elnora update\n/);
	});

	test("writes nothing when stderr is not a TTY", () => {
		Object.defineProperty(process.stderr, "isTTY", { value: false, configurable: true });
		showUpdateNotice("9.9.9");
		expect(writes.join("")).toBe("");
	});
});
