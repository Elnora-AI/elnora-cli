import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	fileId: z.string().uuid().describe("File ID"),
	versionId: z.string().uuid().describe("Version ID to restore"),
});

type Input = z.infer<typeof inputSchema>;

export const filesRestore: ElnoraCommand<Input> = {
	name: "files.restore",
	group: "files",
	description: "Restore a file to a specific version",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		return ctx.client.post("file_version_restore", undefined, {
			pathParams: { id: input.fileId, vid: input.versionId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
