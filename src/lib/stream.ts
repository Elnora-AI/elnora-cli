/**
 * SSE streaming consumer for real-time agent output.
 *
 * Connects to GET /api/v1/tasks/{task_id}/stream on the AI server.
 * Uses native fetch() + ReadableStream — no external SSE library.
 *
 * Auth: The stream endpoint accepts a JWT in the Authorization header.
 * The caller must supply a valid token — either a stream token returned
 * by the .NET backend in the POST /tasks/{id}/messages response, or a
 * user session JWT. Raw API keys are NOT accepted by the AI server.
 */

import { AI_SERVER_URL } from "./config.js";

// ---------------------------------------------------------------------------
// Event types (matches AI server pipeline.py event types)
// ---------------------------------------------------------------------------

export type StreamEvent =
	| { type: "agent_status"; content: string }
	| { type: "token"; content: string; agent?: string }
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
 *
 * @param taskId - Task UUID
 * @param token - JWT accepted by the AI server (stream token from .NET backend or user session JWT)
 */
export async function* streamTask(
	taskId: string,
	token: string,
	options?: StreamOptions,
): AsyncGenerator<StreamEvent> {
	const baseUrl = options?.aiServerBaseUrl ?? AI_SERVER_URL;
	const url = `${baseUrl}/api/v1/tasks/${taskId}/stream`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
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
 *
 * @param taskId - Task UUID
 * @param token - JWT accepted by the AI server
 */
export async function collectStreamResponse(taskId: string, token: string, options?: StreamOptions): Promise<string> {
	let content = "";
	for await (const event of streamTask(taskId, token, options)) {
		if (event.type === "token") {
			content += event.content;
		} else if (event.type === "error") {
			throw new Error(event.content);
		}
	}
	return content;
}
