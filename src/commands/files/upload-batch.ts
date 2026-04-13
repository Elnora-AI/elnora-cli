import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { z } from "zod";
import type { ElnoraCommand } from "../../core/command.js";
import { validateUploadUrl } from "../../lib/client.js";
import { ValidationError } from "../../lib/errors.js";
import type { OutputFormat } from "../../lib/output.js";

const inputSchema = z.object({
	project: z.string().uuid().describe("Project ID"),
	filePaths: z.string().min(1).describe("Comma-separated local file paths to upload"),
	folder: z.string().uuid().optional().describe("Folder ID"),
});

type Input = z.infer<typeof inputSchema>;

interface FileResult {
	fileName: string;
	success: boolean;
	fileId?: string;
	error?: string;
}

export const filesUploadBatch: ElnoraCommand<Input> = {
	name: "files.uploadBatch",
	group: "files",
	description: "Upload multiple files to a project (max 50)",
	inputSchema,
	outputSchema: z.any(),

	async execute(input, ctx) {
		const paths = input.filePaths
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
		if (paths.length === 0) {
			throw new ValidationError("No file paths provided.", "Provide comma-separated file paths.");
		}
		if (paths.length > 50) {
			throw new ValidationError(
				`Too many files (${paths.length}). Maximum is 50.`,
				"Split the upload into batches of 50 or fewer.",
			);
		}

		const results: FileResult[] = [];

		for (const filePath of paths) {
			const fileName = basename(filePath);
			try {
				const contentType = "application/octet-stream";
				const fileSize = statSync(filePath).size;

				// Step 1: Get presigned URL and validate before reading file content
				const uploadInfo = await ctx.client.post<Record<string, unknown>>("file_upload", {
					projectId: input.project,
					fileName,
					contentType,
					fileSizeBytes: fileSize,
					folderId: input.folder,
				});
				const presignedUrl = (uploadInfo.uploadUrl ?? uploadInfo.url) as string;
				const fileId = (uploadInfo.fileId ?? uploadInfo.id) as string;
				validateUploadUrl(presignedUrl);

				// Step 2: Read file and PUT to validated storage URL
				const fileBuffer = readFileSync(filePath);
				await fetch(presignedUrl, {
					method: "PUT",
					body: fileBuffer,
					headers: { "Content-Type": contentType, "Content-Length": String(fileSize) },
				});

				// Step 3: Confirm
				await ctx.client.post("file_upload_confirm", undefined, {
					pathParams: { id: fileId },
				});

				results.push({ fileName, success: true, fileId });
			} catch (err) {
				results.push({
					fileName,
					success: false,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}

		return results;
	},

	formatOutput(output: unknown, format: OutputFormat): string {
		if (format === "compact") {
			const results = output as FileResult[];
			return results.map((r) => `${r.fileName}: ${r.success ? "ok" : "FAILED"}`).join(", ");
		}
		return JSON.stringify(output, null, 2);
	},
};
