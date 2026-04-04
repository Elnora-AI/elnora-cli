import type { ElnoraCommand } from "../../core/command.js";
import { libraryCreateFolder } from "./create-folder.js";
import { libraryDeleteFolder } from "./delete-folder.js";
import { libraryFiles } from "./files.js";
import { libraryFolders } from "./folders.js";
import { libraryRenameFolder } from "./rename-folder.js";

export function registerLibraryCommands(): ElnoraCommand[] {
	return [libraryFiles, libraryFolders, libraryCreateFolder, libraryRenameFolder, libraryDeleteFolder];
}

export { libraryCreateFolder, libraryDeleteFolder, libraryFiles, libraryFolders, libraryRenameFolder };
