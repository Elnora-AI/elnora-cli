import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { maybePrintBanner, renderBanner } from "../../src/lib/banner.js";

const ENV = ["NO_COLOR", "FORCE_COLOR", "CI", "GITHUB_ACTIONS"] as const;

describe("banner", () => {
	const origTTY = process.stderr.isTTY;
	const saved: Record<string, string | undefined> = {};
	let writeSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		for (const k of ENV) {
			saved[k] = process.env[k];
			delete process.env[k];
		}
		Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });
		writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		for (const k of ENV) {
			if (saved[k] === undefined) delete process.env[k];
			else process.env[k] = saved[k];
		}
		Object.defineProperty(process.stderr, "isTTY", { value: origTTY, configurable: true });
		vi.restoreAllMocks();
	});

	test("renderBanner contains the wordmark and version", () => {
		const b = renderBanner();
		expect(b).toContain("ELNORA");
		expect(b).toMatch(/v\d+\.\d+\.\d+/);
	});

	test("NO_COLOR → no ANSI escapes in the banner", () => {
		process.env.NO_COLOR = "1";
		expect(renderBanner()).not.toContain("\x1b[");
	});

	test("bare `elnora` on a TTY prints to stderr", () => {
		maybePrintBanner(["node", "elnora"]);
		expect(writeSpy).toHaveBeenCalled();
		expect(String(writeSpy.mock.calls[0][0])).toContain("ELNORA");
	});

	test("top-level --help prints", () => {
		maybePrintBanner(["node", "elnora", "--help"]);
		expect(writeSpy).toHaveBeenCalled();
	});

	test("silent when stderr is not a TTY (piped)", () => {
		Object.defineProperty(process.stderr, "isTTY", { value: false, configurable: true });
		maybePrintBanner(["node", "elnora"]);
		expect(writeSpy).not.toHaveBeenCalled();
	});

	test("silent for a subcommand", () => {
		maybePrintBanner(["node", "elnora", "tasks", "list"]);
		expect(writeSpy).not.toHaveBeenCalled();
	});

	test("silent for --version", () => {
		maybePrintBanner(["node", "elnora", "--version"]);
		expect(writeSpy).not.toHaveBeenCalled();
	});

	test("silent for subcommand --help", () => {
		maybePrintBanner(["node", "elnora", "tasks", "--help"]);
		expect(writeSpy).not.toHaveBeenCalled();
	});

	test("silent with --quiet", () => {
		maybePrintBanner(["node", "elnora", "--quiet"]);
		expect(writeSpy).not.toHaveBeenCalled();
	});

	test("silent in CI even on a TTY", () => {
		process.env.CI = "1";
		maybePrintBanner(["node", "elnora"]);
		expect(writeSpy).not.toHaveBeenCalled();
	});
});
