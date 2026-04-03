import type { ElnoraCommand } from "../../core/command.js";
import { auditList } from "./list.js";

export function registerAuditCommands(): ElnoraCommand[] {
	return [auditList];
}

export { auditList };
