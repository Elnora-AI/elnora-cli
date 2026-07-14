import type { ElnoraCommand } from "../../core/command.js";
import { foldersChildren } from "./children.js";
import { foldersCreate } from "./create.js";
import { foldersDelete } from "./delete.js";
import { foldersFiles } from "./files.js";
import { foldersGet } from "./get.js";
import { foldersList } from "./list.js";
import { foldersMove } from "./move.js";
import { foldersRename } from "./rename.js";
import { foldersRoots } from "./roots.js";
import { foldersShare } from "./share.js";
import { foldersShares } from "./shares.js";
import { foldersUnshare } from "./unshare.js";

export function registerFolderCommands(): ElnoraCommand[] {
	return [
		foldersRoots,
		foldersChildren,
		foldersGet,
		foldersFiles,
		foldersList,
		foldersCreate,
		foldersRename,
		foldersMove,
		foldersDelete,
		foldersShare,
		foldersUnshare,
		foldersShares,
	];
}

export {
	foldersChildren,
	foldersCreate,
	foldersDelete,
	foldersFiles,
	foldersGet,
	foldersList,
	foldersMove,
	foldersRename,
	foldersRoots,
	foldersShare,
	foldersShares,
	foldersUnshare,
};
