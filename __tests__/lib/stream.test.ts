import { afterEach, describe, expect, test, vi } from "vitest";
import { collectStreamResponse, type StreamEvent, streamTask } from "../../src/lib/stream.js";

/**
 * Create a mock fetch that returns an SSE-formatted ReadableStream.
 */
function mockFetchSSE(events: string[], status = 200) {
	const chunks = events.map((e) => new TextEncoder().encode(e));
	let index = 0;

	const body = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (index < chunks.length) {
				controller.enqueue(chunks[index]);
				index++;
			} else {
				controller.close();
			}
		},
	});

	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		body,
	});
}

function sseEvent(data: Record<string, unknown>): string {
	return `data: ${JSON.stringify(data)}\n\n`;
}

describe("streamTask", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("parses simple SSE event", async () => {
		globalThis.fetch = mockFetchSSE([sseEvent({ type: "token", content: "Hello" }), sseEvent({ type: "completed" })]);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events).toHaveLength(2);
		expect(events[0]).toEqual({ type: "token", content: "Hello" });
		expect(events[1]).toEqual({ type: "completed" });
	});

	test("parses multiple events in single chunk", async () => {
		const combined =
			sseEvent({ type: "think", content: "reasoning" }) +
			sseEvent({ type: "token", content: "Hi" }) +
			sseEvent({ type: "completed" });

		globalThis.fetch = mockFetchSSE([combined]);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events).toHaveLength(3);
		expect(events[0].type).toBe("think");
		expect(events[1].type).toBe("token");
		expect(events[2].type).toBe("completed");
	});

	test("handles event split across chunks", async () => {
		// Split a single event across two chunks
		const fullEvent = `data: {"type":"token","content":"split"}\n\n`;
		const chunk1 = fullEvent.slice(0, 20);
		const chunk2 = fullEvent.slice(20);

		globalThis.fetch = mockFetchSSE([chunk1, chunk2, sseEvent({ type: "completed" })]);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events.length).toBeGreaterThanOrEqual(1);
		const tokenEvent = events.find((e) => e.type === "token");
		expect(tokenEvent).toBeDefined();
		expect((tokenEvent as { content: string }).content).toBe("split");
	});

	test("stops on completed event", async () => {
		globalThis.fetch = mockFetchSSE([
			sseEvent({ type: "token", content: "before" }),
			sseEvent({ type: "completed" }),
			sseEvent({ type: "token", content: "after" }), // should not be yielded
		]);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events).toHaveLength(2);
		expect(events[1].type).toBe("completed");
	});

	test("stops on error event", async () => {
		globalThis.fetch = mockFetchSSE([
			sseEvent({ type: "error", content: "something failed" }),
			sseEvent({ type: "token", content: "should not appear" }),
		]);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("error");
	});

	test("yields error on failed HTTP response", async () => {
		globalThis.fetch = mockFetchSSE([], 401);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("error");
		expect((events[0] as { content: string }).content).toContain("401");
	});

	test("handles event: prefix in SSE", async () => {
		globalThis.fetch = mockFetchSSE([`event: token\ndata: {"content":"typed"}\n\n`, sseEvent({ type: "completed" })]);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events[0].type).toBe("token");
		expect((events[0] as { content: string }).content).toBe("typed");
	});

	test("skips malformed JSON events", async () => {
		globalThis.fetch = mockFetchSSE([
			"data: not-json\n\n",
			sseEvent({ type: "token", content: "valid" }),
			sseEvent({ type: "completed" }),
		]);

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(events).toHaveLength(2);
		expect(events[0].type).toBe("token");
	});

	test("sends correct headers", async () => {
		const mockFn = mockFetchSSE([sseEvent({ type: "completed" })]);
		globalThis.fetch = mockFn;

		const events: StreamEvent[] = [];
		for await (const event of streamTask("task-1", "my-api-key", { aiServerBaseUrl: "http://localhost:8000" })) {
			events.push(event);
		}

		expect(mockFn).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/tasks/task-1/stream",
			expect.objectContaining({
				headers: {
					"X-API-Key": "my-api-key",
					Accept: "text/event-stream",
				},
			}),
		);
	});
});

describe("collectStreamResponse", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("collects all token content into string", async () => {
		globalThis.fetch = mockFetchSSE([
			sseEvent({ type: "token", content: "Hello " }),
			sseEvent({ type: "token", content: "World" }),
			sseEvent({ type: "completed" }),
		]);

		const result = await collectStreamResponse("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" });
		expect(result).toBe("Hello World");
	});

	test("throws on error event", async () => {
		globalThis.fetch = mockFetchSSE([sseEvent({ type: "error", content: "Pipeline failed" })]);

		await expect(collectStreamResponse("task-1", "key", { aiServerBaseUrl: "http://localhost:8000" })).rejects.toThrow(
			"Pipeline failed",
		);
	});
});
