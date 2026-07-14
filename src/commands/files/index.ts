import type { ElnoraCommand } from "../../core/command.js";
import { filesArchive } from "./archive.js";
import { filesCommit } from "./commit.js";
import { filesConfirmUpload } from "./confirm-upload.js";
import { filesContent } from "./content.js";
import { filesCreate } from "./create.js";
import { filesCreateVersion } from "./create-version.js";
import { filesDownload } from "./download.js";
import { filesFork } from "./fork.js";
import { filesGet } from "./get.js";
import { filesList } from "./list.js";
import { filesMove } from "./move.js";
import { filesPromote } from "./promote.js";
import { filesRestore } from "./restore.js";
import { filesSearchContent } from "./search-content.js";
import { filesShare } from "./share.js";
import { filesShares } from "./shares.js";
import { filesUnshare } from "./unshare.js";
import { filesUpdate } from "./update.js";
import { filesUpload } from "./upload.js";
import { filesUploadBatch } from "./upload-batch.js";
import { filesVersionContent } from "./version-content.js";
import { filesVersions } from "./versions.js";
import { filesWorkingCopy } from "./working-copy.js";

export function registerFileCommands(): ElnoraCommand[] {
	return [
		filesList,
		filesGet,
		filesContent,
		filesCreate,
		filesUpload,
		filesUploadBatch,
		filesConfirmUpload,
		filesDownload,
		filesUpdate,
		filesArchive,
		filesVersions,
		filesVersionContent,
		filesCreateVersion,
		filesRestore,
		filesPromote,
		filesFork,
		filesWorkingCopy,
		filesCommit,
		filesSearchContent,
		filesMove,
		filesShare,
		filesUnshare,
		filesShares,
	];
}

export {
	filesArchive,
	filesCommit,
	filesConfirmUpload,
	filesContent,
	filesCreate,
	filesCreateVersion,
	filesDownload,
	filesFork,
	filesGet,
	filesList,
	filesMove,
	filesPromote,
	filesRestore,
	filesSearchContent,
	filesShare,
	filesShares,
	filesUnshare,
	filesUpdate,
	filesUpload,
	filesUploadBatch,
	filesVersionContent,
	filesVersions,
	filesWorkingCopy,
};
