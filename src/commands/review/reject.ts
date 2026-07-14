import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	itemId: z.string().uuid().describe("Review item ID"),
});

type Input = z.infer<typeof inputSchema>;

export const reviewReject: ElnoraCommand<Input> = {
	name: "review.reject",
	group: "review",
	description: "Reject a Knowledge Base review item without applying its change",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("kb_review_reject", {}, { pathParams: { id: input.itemId } });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
