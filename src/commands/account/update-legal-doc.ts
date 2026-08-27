import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	versionId: z.string().describe("Legal document version ID"),
	content: z.string().optional().describe("Updated content"),
	effectiveDate: z.string().optional().describe("Updated effective date (ISO 8601)"),
});

type Input = z.infer<typeof inputSchema>;

export const accountUpdateLegalDoc: ElnoraCommand<Input> = {
	name: "account.updateLegalDoc",
	group: "account",
	description: "Update a legal document version (SystemAdmin only)",
	inputSchema,
	outputSchema: z.any(),
	annotations: { internal: true },

	async execute(input, ctx) {
		const body: Record<string, string> = {};
		if (input.content !== undefined) body.content = input.content;
		if (input.effectiveDate !== undefined) body.effectiveDate = input.effectiveDate;
		if (Object.keys(body).length === 0) {
			throw new ValidationError("At least one of --content or --effectiveDate is required");
		}
		return ctx.client.put("legal_doc_version_id", body, {
			pathParams: { id: input.versionId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
