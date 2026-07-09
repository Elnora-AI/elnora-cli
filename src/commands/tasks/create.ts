import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { pollForResponse } from "../../lib/poll.js";
import { resolveApiKey } from "../../lib/profiles.js";
import { collectStreamResponse, streamTask } from "../../lib/stream.js";
import { StreamRenderer } from "../../lib/stream-renderer.js";

const inputSchema = z.object({
	project: z.string().uuid().optional().describe("Project ID (optional; defaults to your workspace)"),
	title: z.string().optional().describe("Task title"),
	message: z.string().optional().describe("Initial message"),
	wait: z.boolean().default(false).describe("Wait for agent response (polling)"),
	stream: z.boolean().default(false).describe("Stream agent response in real-time (SSE)"),
});

type Input = z.infer<typeof inputSchema>;

export const tasksCreate: ElnoraCommand<Input> = {
	name: "tasks.create",
	group: "tasks",
	description:
		"Create a new task in a project. If a message is provided it is queued, but the AI response is NOT returned — the agent processes asynchronously. Poll elnora_tasks_messages every 5-10s until the last message has role 'assistant' with metadata.status 'completed'. Timeout after 5 min.",
	stdinField: "message",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const result = (await ctx.client.post("tasks", {
			// projectId is optional (ELN-880 Phase C): when omitted the backend creates the
			// task in the caller's default workspace. Only sent when explicitly supplied.
			...(input.project ? { projectId: input.project } : {}),
			title: input.title,
			initialMessage: input.message,
		})) as { id: string; [key: string]: unknown };

		const taskId = result.id;
		const sequence =
			((result as Record<string, unknown>)?.sequence as number) ??
			((result as Record<string, unknown>)?.sequenceNumber as number) ??
			0;

		// No initial message or no response mode requested — return task JSON
		if (!input.message || (!input.stream && !input.wait)) {
			return result;
		}

		// MCP mode: always collect full response via streaming
		if (ctx.mode === "mcp") {
			try {
				const apiKey = resolveApiKey(ctx.profileName);
				const content = await collectStreamResponse(taskId, apiKey);
				return { ...result, response: content };
			} catch (err) {
				process.stderr.write(
					`Stream failed (${err instanceof Error ? err.message : String(err)}), polling fallback.\n`,
				);
				return pollForResponse(ctx.client, taskId, sequence);
			}
		}

		// CLI mode: --stream (SSE) with polling fallback
		if (input.stream) {
			try {
				const apiKey = resolveApiKey(ctx.profileName);
				const renderer = new StreamRenderer({ quiet: ctx.output.quiet });
				for await (const event of streamTask(taskId, apiKey)) {
					renderer.renderEvent(event);
				}
				renderer.stopSpinner();
				return { ...result, streamed: true };
			} catch {
				// Streaming failed — fall back to polling
				process.stderr.write("Streaming failed — falling back to polling.\n");
				return pollForResponse(ctx.client, taskId, sequence);
			}
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
