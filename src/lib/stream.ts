/**
 * SSE streaming consumer for real-time agent output.
 *
 * Connects to GET /api/v1/tasks/{task_id}/stream on the AI server.
 * Uses native fetch() + ReadableStream — no external SSE library.
 *
 * Provides real-time agent response streaming for CLI and MCP clients.
 */

import { AI_SERVER_URL, BASE_URL, DEFAULT_HEADERS } from "./config.js";

// ---------------------------------------------------------------------------
// Stream token exchange — get a short-lived JWT from the backend
// ---------------------------------------------------------------------------

/**
 * Exchange an API key for a short-lived JWT accepted by the AI server's
 * SSE stream endpoint. The backend validates the API key against its
 * database and returns a 10-minute JWT.
 */
async function getStreamToken(taskId: string, apiKey: string): Promise<string> {
	const url = `${BASE_URL}/auth/stream-token`;
	const response = await fetch(url, {
		method: "POST",
		headers: {
			...DEFAULT_HEADERS,
			"X-API-Key": apiKey,
		},
		body: JSON.stringify({ taskId }),
		signal: AbortSignal.timeout(10_000),
	});

	if (!response.ok) {
		throw new Error(`Stream token exchange failed: HTTP ${response.status}`);
	}

	const data = (await response.json()) as { token: string };
	return data.token;
}

// ---------------------------------------------------------------------------
// Event types (matches AI server pipeline.py EventType)
// ---------------------------------------------------------------------------

export type StreamEvent =
	| { type: "think"; content: string; turn?: number }
	| { type: "tool_start"; tool: string; args?: Record<string, unknown> }
	| { type: "tool_end"; tool: string; success: boolean; result?: string }
	| { type: "progress"; content: string }
	| { type: "token"; content: string }
	| { type: "completed"; content?: string }
	| { type: "error"; content: string }
	| { type: "timeout" };

const TERMINAL_EVENTS = new Set(["completed", "error", "timeout"]);
const STREAM_TIMEOUT_MS = 300_000; // 5 minutes (matches AI server _STREAM_TTL_SECONDS)

export interface StreamOptions {
	signal?: AbortSignal;
	aiServerBaseUrl?: string;
}

/**
 * Subscribe to SSE stream for a task's agent output.
 *
 * Yields StreamEvent objects as they arrive from the AI server.
 * Stops on terminal events (completed, error, timeout).
 */
export async function* streamTask(
	taskId: string,
	apiKey: string,
	options?: StreamOptions,
): AsyncGenerator<StreamEvent> {
	// Exchange the API key for a short-lived JWT accepted by the AI server
	let streamToken: string;
	try {
		streamToken = await getStreamToken(taskId, apiKey);
	} catch (err) {
		yield { type: "error", content: `Failed to get stream token: ${err instanceof Error ? err.message : String(err)}` };
		return;
	}

	const baseUrl = options?.aiServerBaseUrl ?? AI_SERVER_URL;
	const url = `${baseUrl}/api/v1/tasks/${taskId}/stream`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${streamToken}`,
			Accept: "text/event-stream",
		},
		signal: options?.signal ?? AbortSignal.timeout(STREAM_TIMEOUT_MS),
	});

	if (!response.ok || !response.body) {
		yield { type: "error", content: `Stream connection failed: HTTP ${response.status}` };
		return;
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let eventType = "";
	let dataLines: string[] = [];

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				if (line.startsWith("event: ")) {
					eventType = line.slice(7).trim();
				} else if (line.startsWith("data: ")) {
					dataLines.push(line.slice(6));
				} else if (line === "") {
					// End of SSE event — emit parsed event
					if (dataLines.length > 0) {
						const raw = dataLines.join("\n");
						try {
							const parsed = JSON.parse(raw) as StreamEvent;
							const event: StreamEvent = eventType
								? ({ ...parsed, type: eventType } as unknown as StreamEvent)
								: parsed;
							yield event;
							if (TERMINAL_EVENTS.has(event.type)) return;
						} catch {
							// Skip malformed events
						}
						dataLines = [];
					}
					eventType = "";
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Collect all streamed content into a single string.
 * Used by MCP mode to return complete response.
 */
export async function collectStreamResponse(taskId: string, apiKey: string, options?: StreamOptions): Promise<string> {
	let content = "";
	for await (const event of streamTask(taskId, apiKey, options)) {
		if (event.type === "token") {
			content += event.content;
		} else if (event.type === "error") {
			throw new Error(event.content);
		}
	}
	return content;
}
