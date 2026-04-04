import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	documentVersionId: z.string().describe("Document version ID to accept"),
});

type Input = z.infer<typeof inputSchema>;

export const accountAcceptTerms: ElnoraCommand<Input> = {
	name: "account.acceptTerms",
	group: "account",
	description: "Accept a user agreement / terms of service",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("user_agreement", {
			documentVersionId: input.documentVersionId,
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
