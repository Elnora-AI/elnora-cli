import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	userId: z.string().describe("User ID"),
	firstName: z.string().optional().describe("First name"),
	lastName: z.string().optional().describe("Last name"),
});

type Input = z.infer<typeof inputSchema>;

export const accountUpdate: ElnoraCommand<Input> = {
	name: "account.update",
	group: "account",
	description: "Update account details for a user",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const body: Record<string, string> = {};
		if (input.firstName !== undefined) body.firstName = input.firstName;
		if (input.lastName !== undefined) body.lastName = input.lastName;
		if (Object.keys(body).length === 0) {
			throw new ValidationError("At least one of --firstName or --lastName is required");
		}
		// Backend exposes PUT /account/user/{id} (no PATCH) — using PATCH here 405'd.
		return ctx.client.put("account_user", body, {
			pathParams: { id: input.userId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
