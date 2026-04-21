import type { ElnoraCommand } from "../../core/command.js";
import { keysCreate } from "./create.js";
import { keysGetPolicy } from "./get-policy.js";
import { keysList } from "./list.js";
import { keysRevoke } from "./revoke.js";
import { keysSetPolicy } from "./set-policy.js";

export function registerApiKeyCommands(): ElnoraCommand[] {
	return [keysCreate, keysList, keysRevoke, keysGetPolicy, keysSetPolicy];
}

export { keysCreate, keysGetPolicy, keysList, keysRevoke, keysSetPolicy };
