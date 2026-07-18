import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { projectsRemoved } from "../_shared/deprecated.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID to leave"),
});

type Input = z.infer<typeof inputSchema>;

export const projectsLeave: ElnoraCommand<Input> = {
	name: "projects.leave",
	group: "projects",
	description: "[DEPRECATED] Leave a project — projects were removed; this is a no-op.",
	inputSchema,
	outputSchema: z.any(),
	annotations: { destructiveHint: true },

	async execute() {
		return projectsRemoved();
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
