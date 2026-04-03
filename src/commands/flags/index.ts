import type { ElnoraCommand } from "../../core/command.js";
import { flagsGet } from "./get.js";
import { flagsList } from "./list.js";
import { flagsSet } from "./set.js";

export function registerFlagCommands(): ElnoraCommand[] {
	return [flagsList, flagsGet, flagsSet];
}

export { flagsGet, flagsList, flagsSet };
