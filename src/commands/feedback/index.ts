import type { ElnoraCommand } from "../../core/command.js";
import { feedbackSubmit } from "./submit.js";

export function registerFeedbackCommands(): ElnoraCommand[] {
	return [feedbackSubmit];
}

export { feedbackSubmit };
