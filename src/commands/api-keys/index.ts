import type { ElnoraCommand } from "../../core/command.js";
import { apiKeysCreate } from "./create.js";
import { apiKeysGetPolicy } from "./get-policy.js";
import { apiKeysList } from "./list.js";
import { apiKeysRevoke } from "./revoke.js";
import { apiKeysSetPolicy } from "./set-policy.js";

export function registerApiKeyCommands(): ElnoraCommand[] {
	return [apiKeysCreate, apiKeysList, apiKeysRevoke, apiKeysGetPolicy, apiKeysSetPolicy];
}

export { apiKeysCreate, apiKeysGetPolicy, apiKeysList, apiKeysRevoke, apiKeysSetPolicy };
