import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
	userId: z.string().uuid().describe("User ID of the member"),
	role: z.string().min(1).describe("New role to assign"),
});

type Input = z.infer<typeof inputSchema>;

export const projectsUpdateRole: ElnoraCommand<Input> = {
	name: "projects.updateRole",
	group: "projects",
	description: "Update a project member's role",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		return ctx.client.put(
			"project_member_role",
			{ role: input.role },
			{ pathParams: { id: input.projectId, uid: input.userId } },
		);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
