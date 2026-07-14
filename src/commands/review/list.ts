import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	status: z
		.enum(["pending", "applied", "rejected", "all"])
		.default("pending")
		.describe("Filter by review status ('all' lists every state)"),
});

type Input = z.infer<typeof inputSchema>;

export const reviewList: ElnoraCommand<Input> = {
	name: "review.list",
	group: "review",
	description: "List the Knowledge Base review queue (auto-tidy proposals awaiting approval)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		// The backend lists every state when status is empty; "all" maps to that.
		const status = input.status === "all" ? "" : input.status;
		return ctx.client.get("kb_review_items", { queryParams: { status } });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
