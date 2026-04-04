import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { pollForResponse } from "../../lib/poll.js";
import { resolveApiKey } from "../../lib/profiles.js";
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
			} catch {
				return pollForResponse(ctx.client, taskId);
			}
		}

		// CLI mode: --stream (SSE)
		if (input.stream) {
			const apiKey = resolveApiKey(ctx.profileName);
			const renderer = new StreamRenderer();
			for await (const event of streamTask(taskId, apiKey)) {
				renderer.renderEvent(event);
			}
			renderer.stopSpinner();
			return { ...result, streamed: true };
		}

		// CLI mode: --wait (polling)
		return pollForResponse(ctx.client, taskId);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		const data = output as { id?: string; streamed?: boolean };
		if (format === "compact") return data.id ?? JSON.stringify(output);
		if (data.streamed) return ""; // stream already rendered to stdout

		const lines = [
			`✓ Task created: ${data.id}`,
			"",
			"Send a message:",
			`  elnora tasks send ${data.id} --message "Your message" --stream`,
		];
		return lines.join("\n");
	},
};
