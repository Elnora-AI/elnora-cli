import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	title: z.string().min(1).describe("Feedback title"),
	description: z.string().min(1).describe("Feedback description"),
});

type Input = z.infer<typeof inputSchema>;

export const feedbackSubmit: ElnoraCommand<Input> = {
	name: "feedback.submit",
	group: "feedback",
	description: "Submit feedback",
	stdinField: "description",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("feedback", {
			title: input.title,
			description: input.description,
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
