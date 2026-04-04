import { ElnoraError } from "./errors.js";

/**
 * Poll GET /tasks/{id}/messages until an assistant message appears
 * with a sequence number higher than the given threshold.
 */
export async function pollForResponse(
	client: {
		get: (
			endpoint: string,
			opts?: { pathParams?: Record<string, string>; queryParams?: Record<string, string | number> },
		) => Promise<unknown>;
	},
	taskId: string,
	afterSequence = 0,
	timeoutMs = 120_000,
): Promise<unknown> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const messages = await client.get("task_messages", {
			pathParams: { id: taskId },
			queryParams: { limit: 10 },
		});

		const items = Array.isArray(messages)
			? messages
			: (((messages as Record<string, unknown>)?.items as unknown[]) ?? []);
		if (Array.isArray(items)) {
			const assistantMsg = items.find((m: unknown) => {
				const msg = m as Record<string, unknown>;
				return (
					(msg.role === "assistant" || msg.role === "Assistant") &&
					((msg.sequence as number) ?? (msg.sequenceNumber as number) ?? 0) > afterSequence
				);
			});
			if (assistantMsg) return assistantMsg;
		}

		await new Promise((r) => setTimeout(r, 2000));
	}

	throw new ElnoraError("Timed out waiting for agent response (120s)", {
		code: "RESPONSE_TIMEOUT",
		suggestion: `The agent may still be processing. Check with: elnora tasks messages ${taskId}`,
	});
}
