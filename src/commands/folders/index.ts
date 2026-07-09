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
};
