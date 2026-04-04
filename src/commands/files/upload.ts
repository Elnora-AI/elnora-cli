import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { validateUploadUrl } from "../../lib/client.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	project: z.string().uuid().describe("Project ID"),
	filePath: z.string().min(1).describe("Local file path to upload"),
	fileName: z.string().optional().describe("Override file name"),
	contentType: z.string().optional().describe("MIME content type"),
});

type Input = z.infer<typeof inputSchema>;

export const filesUpload: ElnoraCommand<Input> = {
	name: "files.upload",
	group: "files",
	description: "Upload a file to a project (three-stage: presign, PUT, confirm)",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const fileBuffer = readFileSync(input.filePath);
		const fileName = input.fileName ?? basename(input.filePath);
		const contentType = input.contentType ?? "application/octet-stream";
		const fileSize = statSync(input.filePath).size;

		// Step 1: Get presigned URL
		const uploadInfo = await ctx.client.post<Record<string, unknown>>("file_upload", {
			projectId: input.project,
			fileName,
			contentType,
			fileSizeBytes: fileSize,
		});
		const presignedUrl = (uploadInfo.uploadUrl ?? uploadInfo.url) as string;
		const fileId = (uploadInfo.fileId ?? uploadInfo.id) as string;
		validateUploadUrl(presignedUrl);

		// Step 2: PUT to storage
		await fetch(presignedUrl, {
			method: "PUT",
			body: fileBuffer,
			headers: { "Content-Type": contentType, "Content-Length": String(fileSize) },
		});

		// Step 3: Confirm
		return ctx.client.post("file_upload_confirm", undefined, {
			pathParams: { id: fileId },
		});
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") return (output as { id?: string }).id ?? JSON.stringify(output);
		return JSON.stringify(output, null, 2);
	},
};
