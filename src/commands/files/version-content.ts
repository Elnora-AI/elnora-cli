import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	versionId: z.string().uuid().describe("Version ID"),
});

type Input = z.infer<typeof inputSchema>;

export const filesVersionContent: ElnoraCommand<Input> = {
	name: "files.versionContent",
	group: "files",
	description: "Get the raw content of a specific file version",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute(input, ctx) {
		return ctx.client.get("file_version_content", {
			pathParams: { id: input.fileId, vid: input.versionId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (typeof output === "string") return output;
		return JSON.stringify(output, null, 2);
	},
};
