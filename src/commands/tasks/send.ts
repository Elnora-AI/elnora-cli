import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { pollForResponse } from "../../lib/poll.js";
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
