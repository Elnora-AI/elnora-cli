import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	name: z.string().min(1).describe("Project name"),
	description: z.string().optional().describe("Project description"),
	icon: z.string().optional().describe("Project icon"),
});

type Input = z.infer<typeof inputSchema>;

export const projectsCreate: ElnoraCommand<Input> = {
	name: "projects.create",
	group: "projects",
	description: "Create a new project",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("projects", input);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		const data = output as { id?: string; name?: string };
		if (format === "compact") return data.id ?? JSON.stringify(output);

		const lines = [
			`✓ Project "${data.name}" created.`,
			"",
			"Next step — start a conversation:",
			`  elnora tasks create --project ${data.id} --message "Hello Elnora"`,
		];
		return lines.join("\n");
	},
};
