import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { pollForResponse } from "../../lib/poll.js";
import { collectStreamResponse, streamTask } from "../../lib/stream.js";
import { StreamRenderer } from "../../lib/stream-renderer.js";

const inputSchema = z.object({
	project: z.string().uuid().describe("Project ID"),
	title: z.string().optional().describe("Task title"),
	message: z.string().optional().describe("Initial message"),
	wait: z.boolean().default(false).describe("Wait for agent response (polling)"),
	stream: z.boolean().default(false).describe("Stream agent response in real-time (SSE)"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksCreate: ElnoraCommand<Input> = {
	name: "tasks.create",
	group: "tasks",
	description: "Create a new task in a project",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const result = (await ctx.client.post("tasks", {
			projectId: input.project,
			title: input.title,
			initialMessage: input.message,
		})) as { id: string; [key: string]: unknown };

		const taskId = result.id;
		const streamToken = (result as Record<string, unknown>)?.streamToken as string | undefined;
		const sequence =
			((result as Record<string, unknown>)?.sequence as number) ??
			((result as Record<string, unknown>)?.sequenceNumber as number) ??
			0;

		// No initial message or no response mode requested — return task JSON
		if (!input.message || (!input.stream && !input.wait)) {
			return result;
		}

		// MCP mode: always collect full response (streaming with polling fallback)
		if (ctx.mode === "mcp") {
			if (streamToken) {
				try {
					const content = await collectStreamResponse(taskId, streamToken);
					return { ...result, response: content };
				} catch {
					// Streaming failed — fall through to polling
				}
			}
			return pollForResponse(ctx.client, taskId, sequence);
		}

		// CLI mode: --stream (SSE) with polling fallback
		if (input.stream) {
			if (!streamToken) {
				process.stderr.write("Streaming not available — falling back to polling.\n");
				return pollForResponse(ctx.client, taskId, sequence);
			}
			const renderer = new StreamRenderer();
			for await (const event of streamTask(taskId, streamToken)) {
				renderer.renderEvent(event);
			}
			renderer.stopSpinner();
			return { ...result, streamed: true };
		}

		// CLI mode: --wait (polling)
		return pollForResponse(ctx.client, taskId, sequence);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		const data = output as { id?: string; streamed?: boolean };
		if (format === "compact") return data.id ?? JSON.stringify(output);
		if (data.streamed) return "";
		return JSON.stringify(output, null, 2);
	},
};
