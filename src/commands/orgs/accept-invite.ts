import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	token: z.string().min(1).describe("Invitation token"),
});

type Input = z.infer<typeof inputSchema>;

export const orgsAcceptInvite: ElnoraCommand<Input> = {
	name: "orgs.acceptInvite",
	group: "orgs",
	description: "Accept an organization invitation by token",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("invitation_accept", undefined, {
			pathParams: { token: input.token },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
