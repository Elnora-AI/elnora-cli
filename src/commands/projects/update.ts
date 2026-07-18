import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { projectsRemoved } from "../_shared/deprecated.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
	name: z.string().min(1).optional().describe("New project name"),
	description: z.string().optional().describe("New project description"),
	icon: z.string().optional().describe("New project icon"),
});

type Input = z.infer<typeof inputSchema>;

export const projectsUpdate: ElnoraCommand<Input> = {
	name: "projects.update",
	group: "projects",
	description: "[DEPRECATED] Update an existing project — projects were removed; this is a no-op.",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute() {
		return projectsRemoved();
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
