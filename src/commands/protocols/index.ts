import type { ElnoraCommand } from "../../core/command.js";
import { protocolsGenerate } from "./generate.js";

export function registerProtocolCommands(): ElnoraCommand[] {
	return [protocolsGenerate];
}

export { protocolsGenerate };
