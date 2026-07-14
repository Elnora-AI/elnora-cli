import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID to share"),
	userId: z.number().int().positive().optional().describe("User ID to share with (omit when using --org-wide)"),
	orgWide: z.boolean().default(false).describe("Share with everyone in the organization"),
	role: z.enum(["viewer", "editor", "admin"]).default("editor").describe("Access role to grant"),
});

type Input = z.infer<typeof inputSchema>;

export const filesShare: ElnoraCommand<Input> = {
	name: "files.share",
	group: "files",
	description: "Share a file with a user or the whole organization (default role: editor)",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		// Exactly one principal: a specific user OR the whole org (teams are not available yet).
		if (input.orgWide === (input.userId !== undefined)) {
			throw new ValidationError(
				"Specify exactly one recipient.",
				"Pass either --user-id <id> or --org-wide (not both, and not neither).",
			);
		}
		const body = input.orgWide ? { isOrgWide: true, role: input.role } : { userId: input.userId, role: input.role };
		return ctx.client.post("file_share", body, { pathParams: { id: input.fileId } });
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
