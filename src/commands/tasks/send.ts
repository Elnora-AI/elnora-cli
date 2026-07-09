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
	stdinField: "message",
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

		const sequence =
			((result as Record<string, unknown>)?.sequence as number) ??
			((result as Record<string, unknown>)?.sequenceNumber as number) ??
			0;

		// MCP mode: always collect full response via streaming
		if (ctx.mode === "mcp") {
			try {
				const apiKey = resolveApiKey(ctx.profileName);
				const content = await collectStreamResponse(input.taskId, apiKey);
				return { sent: true, taskId: input.taskId, response: content };
			} catch (err) {
				// If streaming fails in MCP mode, fall back to polling
				process.stderr.write(
					`Stream failed (${err instanceof Error ? err.message : String(err)}), polling fallback.\n`,
				);
				return pollForResponse(ctx.client, input.taskId, sequence);
			}
		}

		// CLI mode: fire-and-forget (default)
		if (!input.wait && !input.stream) {
			return result;
		}

		// CLI mode: --stream (SSE) with polling fallback
		if (input.stream) {
			try {
				const apiKey = resolveApiKey(ctx.profileName);
				const renderer = new StreamRenderer({ quiet: ctx.output.quiet });
				for await (const event of streamTask(input.taskId, apiKey)) {
					renderer.renderEvent(event);
				}
				renderer.stopSpinner();
				return { sent: true, taskId: input.taskId, streamed: true };
			} catch {
				// Streaming failed — fall back to polling
				process.stderr.write("Streaming failed — falling back to polling.\n");
				return pollForResponse(ctx.client, input.taskId, sequence);
			}
		}

		// CLI mode: --wait (polling)
		return pollForResponse(ctx.client, input.taskId, sequence);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		const data = output as { id?: string; streamed?: boolean };
		if (format === "compact") return data.id ?? JSON.stringify(output);
		if (data.streamed) return "";
		return JSON.stringify(output, null, 2);
	},
};
