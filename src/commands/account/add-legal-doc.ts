import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	documentType: z.string().min(1).describe("Document type"),
	version: z.string().min(1).describe("Document version string"),
	content: z.string().min(1).describe("Document content"),
	effectiveDate: z.string().optional().describe("Effective date (ISO 8601)"),
});

type Input = z.infer<typeof inputSchema>;

export const accountAddLegalDoc: ElnoraCommand<Input> = {
	name: "account.addLegalDoc",
	group: "account",
	description: "Add a legal document version (SystemAdmin only)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { internal: true },

	async execute(input, ctx) {
		const body: Record<string, string> = {
			documentType: input.documentType,
			version: input.version,
			content: input.content,
		};
		if (input.effectiveDate) body.effectiveDate = input.effectiveDate;
		return ctx.client.post("legal_doc_version", body);
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
