import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

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
	description: "Update an existing project",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		const { projectId, ...fields } = input;
		if (!fields.name && !fields.description && !fields.icon) {
			throw new ValidationError(
				"At least one field (name, description, icon) must be provided.",
				"Provide at least one field to update.",
			);
		}
		return ctx.client.patch("project", fields, {
			pathParams: { id: projectId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
