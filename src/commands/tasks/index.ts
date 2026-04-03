import type { ElnoraCommand } from "../../core/command.js";
import { tasksArchive } from "./archive.js";
import { tasksCreate } from "./create.js";
import { tasksGet } from "./get.js";
import { tasksList } from "./list.js";
import { tasksMessages } from "./messages.js";
import { tasksSend } from "./send.js";
import { tasksUpdate } from "./update.js";

export function registerTaskCommands(): ElnoraCommand[] {
	return [
		tasksList,
		tasksGet,
		tasksCreate,
		tasksSend,
		tasksMessages,
		tasksUpdate,
		tasksArchive,
	];
}

export {
	tasksArchive,
	tasksCreate,
	tasksGet,
	tasksList,
	tasksMessages,
	tasksSend,
	tasksUpdate,
};
