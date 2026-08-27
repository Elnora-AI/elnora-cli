import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	orgId: z.string().uuid().describe("Organization ID"),
	name: z.string().min(1).optional().describe("New organization name"),
	description: z.string().optional().describe("New organization description"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsUpdate: ElnoraCommand<Input> = {
	name: "orgs.update",
	group: "orgs",
	description: "Update an existing organization",
	inputSchema,
	outputSchema: z.any(),
	annotations: { idempotentHint: true },

	async execute(input, ctx) {
		const { orgId, ...fields } = input;
		if (!fields.name && !fields.description) {
			throw new ValidationError(
				"At least one field (name, description) must be provided.",
				"Provide at least one field to update.",
			);
		}
		return ctx.client.put("organization", fields, {
			pathParams: { id: orgId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
