import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ElnoraError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";
import { resolveApiKey } from "../../lib/profiles.js";
import { collectStreamResponse, streamTask } from "../../lib/stream.js";
import { StreamRenderer } from "../../lib/stream-renderer.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputSchema = z.object({
	taskId: z.string().uuid().describe("Task ID"),
	message: z.string().min(1).describe("Message content"),
	fileRefs: z.string().optional().describe("Comma-separated file reference UUIDs"),
	wait: z.boolean().default(false).describe("Wait for agent response (polling)"),
	stream: z.boolean().default(false).describe("Stream agent response in real-time (SSE)"),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Poll GET /tasks/{id}/messages until an assistant message appears
 * with a sequence number higher than the user's message.
 */
async function pollForResponse(
	client: {
		get: (
			endpoint: string,
			opts?: { pathParams?: Record<string, string>; queryParams?: Record<string, string | number> },
		) => Promise<unknown>;
	},
	taskId: string,
	userMessageSequence: number,
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
					msg.role === "Assistant" &&
					((msg.sequence as number) ?? (msg.sequenceNumber as number) ?? 0) > userMessageSequence
				);
			});
			if (assistantMsg) return assistantMsg;
		}

		await new Promise((r) => setTimeout(r, 2000));
	}

	throw new ElnoraError("Timed out waiting for agent response (120s)", {
		code: "RESPONSE_TIMEOUT",
		suggestion: "The agent may still be processing. Check with: elnora tasks messages <task-id>",
	});
}

export const tasksSend: ElnoraCommand<Input> = {
	name: "tasks.send",
	group: "tasks",
	description: "Send a message to a task",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		// Parse file refs
		let referencedFileIds: string[] | undefined;
		if (input.fileRefs) {
			referencedFileIds = input.fileRefs
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
				.filter((s) => UUID_RE.test(s));
		}

		// Send message
		const result = await ctx.client.post(
			"task_messages",
			{
				content: input.message,
				referencedFileIds,
			},
			{ pathParams: { id: input.taskId } },
		);

		// MCP mode: always collect full response via streaming
		if (ctx.mode === "mcp") {
			try {
				const apiKey = resolveApiKey(ctx.profileName);
				const content = await collectStreamResponse(input.taskId, apiKey);
				return { sent: true, taskId: input.taskId, response: content };
			} catch {
				// If streaming fails in MCP mode, fall back to polling
				const seq = ((result as Record<string, unknown>)?.sequence as number) ?? 0;
				return pollForResponse(ctx.client, input.taskId, seq);
			}
		}

		// CLI mode: fire-and-forget (default)
		if (!input.wait && !input.stream) {
			return result;
		}

		// CLI mode: --stream (SSE)
		if (input.stream) {
			const apiKey = resolveApiKey(ctx.profileName);
			const renderer = new StreamRenderer();
			for await (const event of streamTask(input.taskId, apiKey)) {
				renderer.renderEvent(event);
			}
			renderer.stopSpinner();
			return { sent: true, taskId: input.taskId, streamed: true };
		}

		// CLI mode: --wait (polling)
		const sequence =
			((result as Record<string, unknown>)?.sequence as number) ??
			((result as Record<string, unknown>)?.sequenceNumber as number) ??
			0;
		return pollForResponse(ctx.client, input.taskId, sequence);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
