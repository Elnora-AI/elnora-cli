import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

/**
 * Aggregate command — creates a task and sends the description as the first
 * message in a single call. Exists for agent workflows where one shot is
 * more natural than create-then-send. Exposed on both CLI and MCP.
 */
const inputSchema = z.object({
	description: z.string().min(10).max(5000).describe("Protocol description"),
	title: z.string().max(200).optional().describe("Task title (defaults to first 100 chars of description)"),
	project: z.string().uuid().optional().describe("Project UUID to associate with"),
});

type Input = z.infer<typeof inputSchema>;

export const protocolsGenerate: ElnoraCommand<Input> = {
	name: "protocols.generate",
	group: "protocols",
	description: "Generate a bioprotocol — creates a task and sends the description in one call",
	inputSchema,
	outputSchema: z.any(),
	annotations: { mcpScopes: ["tasks:write", "messages:write"] },

	async execute(input, ctx) {
		const body: Record<string, unknown> = { title: input.title || input.description.slice(0, 100) };
		if (input.project) body.projectId = input.project;
		const task = await ctx.client.post<{ id: string }>("tasks", body);
		if (!task?.id) {
			throw new Error("Task creation returned no ID");
		}
		try {
			const response = await ctx.client.post(`tasks/${task.id}/messages`, { content: input.description });
			return { taskId: task.id, response };
		} catch (err) {
			// Task exists but message send failed — surface the taskId so the caller
			// can retry with `tasks.send` instead of creating a duplicate task.
			const message = err instanceof Error ? err.message : String(err);
			throw Object.assign(
				new Error(`Task ${task.id} created but message send failed: ${message}. Retry with 'elnora tasks send --task-id ${task.id}'.`),
				{ taskId: task.id },
			);
		}
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { taskId?: string }).taskId ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
