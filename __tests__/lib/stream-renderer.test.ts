import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { StreamRenderer } from "../../src/lib/stream-renderer.js";

describe("StreamRenderer", () => {
	let stdoutWrite: ReturnType<typeof vi.spyOn>;
	let stderrWrite: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		stdoutWrite = vi.spyOn(process.stdout, "write").mockReturnValue(true);
		stderrWrite = vi.spyOn(process.stderr, "write").mockReturnValue(true);
	});

	afterEach(() => {
		stdoutWrite.mockRestore();
		stderrWrite.mockRestore();
	});

	test("writes token content to stdout", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "token", content: "Hello world" });
		renderer.stopSpinner();
		expect(stdoutWrite).toHaveBeenCalledWith("Hello world");
	});

	test("writes think status to stderr", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "think", content: "reasoning" });
		renderer.stopSpinner();
		// Spinner writes to stderr (either animated frame or plain text in non-TTY)
		expect(stderrWrite).toHaveBeenCalled();
	});

	test("writes tool_start to stderr", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "tool_start", tool: "PubMed search" });
		renderer.stopSpinner();
		expect(stderrWrite).toHaveBeenCalled();
	});

	test("shows tool success icon on tool_end", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "tool_end", tool: "PubMed search", success: true });
		const output = stderrWrite.mock.calls.map((c) => String(c[0])).join("");
		expect(output).toContain("✓");
		expect(output).toContain("PubMed search");
	});

	test("shows tool failure icon on tool_end", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "tool_end", tool: "UniProt", success: false });
		const output = stderrWrite.mock.calls.map((c) => String(c[0])).join("");
		expect(output).toContain("✗");
		expect(output).toContain("UniProt");
	});

	test("writes progress to stderr", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "progress", content: "Processing..." });
		const output = stderrWrite.mock.calls.map((c) => String(c[0])).join("");
		expect(output).toContain("Processing...");
	});

	test("writes newline on completed", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "completed" });
		expect(stdoutWrite).toHaveBeenCalledWith("\n");
	});

	test("writes error to stderr", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "error", content: "Pipeline failed" });
		const output = stderrWrite.mock.calls.map((c) => String(c[0])).join("");
		expect(output).toContain("Error:");
		expect(output).toContain("Pipeline failed");
	});

	test("writes timeout to stderr", () => {
		const renderer = new StreamRenderer();
		renderer.renderEvent({ type: "timeout" });
		const output = stderrWrite.mock.calls.map((c) => String(c[0])).join("");
		expect(output).toContain("timed out");
	});
});
