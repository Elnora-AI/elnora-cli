import type { ElnoraCommand } from "../../core/command.js";
import { foldersCreate } from "./create.js";
import { foldersDelete } from "./delete.js";
import { foldersList } from "./list.js";
import { foldersMove } from "./move.js";
import { foldersRename } from "./rename.js";

export function registerFolderCommands(): ElnoraCommand[] {
	return [
		foldersList,
		foldersCreate,
		foldersRename,
		foldersMove,
		foldersDelete,
	];
}

export {
	foldersCreate,
	foldersDelete,
	foldersList,
	foldersMove,
	foldersRename,
};
