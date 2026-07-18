import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import type { OutputFormat } from "../../lib/output.js";
import { projectsRemoved } from "../_shared/deprecated.js";

const inputSchema = z.object({
	projectId: z.string().uuid().describe("Project ID"),
});

type Input = z.infer<typeof inputSchema>;

export const foldersList: ElnoraCommand<Input> = {
	name: "folders.list",
	group: "folders",
	description:
		"[DEPRECATED] List folders in a project — projects were removed. Use `folders roots` and `folders children` to browse the Knowledge Base.",
	inputSchema,
	outputSchema: z.any(),
	annotations: { readOnlyHint: true },

	async execute() {
		// No-op: the legacy /projects/{id}/folders route is retired.
		return projectsRemoved({
			hint: "Use `elnora folders roots` and `elnora folders children <FOLDER_ID>` to browse Knowledge Base folders.",
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
