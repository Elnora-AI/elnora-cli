import type { ElnoraCommand } from "../../core/command.js";
import { authLogin } from "./login.js";
import { authLogout } from "./logout.js";
import { authProfiles } from "./profiles.js";
import { authStatus } from "./status.js";
import { authValidate } from "./validate.js";

export function registerAuthCommands(): ElnoraCommand[] {
	return [
		authLogin,
		authStatus,
		authLogout,
		authProfiles,
		authValidate,
	];
}

export { authLogin, authLogout, authProfiles, authStatus, authValidate };
