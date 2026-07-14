import type { ElnoraCommand } from "../../core/command.js";
import { tasksArchive } from "./archive.js";
import { tasksAttachmentContent } from "./attachment-content.js";
import { tasksAttachments } from "./attachments.js";
import { tasksCreate } from "./create.js";
import { tasksGet } from "./get.js";
import { tasksList } from "./list.js";
import { tasksMessages } from "./messages.js";
import { tasksSend } from "./send.js";
import { tasksUnarchive } from "./unarchive.js";
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
		tasksUnarchive,
		tasksAttachments,
		tasksAttachmentContent,
	];
}

export {
	tasksArchive,
	tasksAttachmentContent,
	tasksAttachments,
	tasksCreate,
	tasksGet,
	tasksList,
	tasksMessages,
	tasksSend,
	tasksUnarchive,
	tasksUpdate,
};
