import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	content: z.string().optional().describe("Version content"),
});

type Input = z.infer<typeof inputSchema>;

export const filesCreateVersion: ElnoraCommand<Input> = {
	name: "files.createVersion",
	group: "files",
	description: "Create a new version of a file",
	stdinField: "content",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const body: Record<string, unknown> = {};
		if (input.content !== undefined) body.content = input.content;
		return ctx.client.post("file_versions", body, {
			pathParams: { id: input.fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
