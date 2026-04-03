import type { ElnoraCommand } from "../../core/command.js";
import { searchAll } from "./all.js";
import { searchFileContent } from "./file-content.js";
import { searchFiles } from "./files.js";
import { searchTasks } from "./tasks.js";

export function registerSearchCommands(): ElnoraCommand[] {
	return [searchTasks, searchFiles, searchAll, searchFileContent];
}

export { searchAll, searchFileContent, searchFiles, searchTasks };
