import type { ElnoraCommand } from "../../core/command.js";
import { projectsAddMember } from "./add-member.js";
import { projectsArchive } from "./archive.js";
import { projectsCreate } from "./create.js";
import { projectsGet } from "./get.js";
import { projectsLeave } from "./leave.js";
import { projectsList } from "./list.js";
import { projectsMembers } from "./members.js";
import { projectsRemoveMember } from "./remove-member.js";
import { projectsUpdate } from "./update.js";
import { projectsUpdateRole } from "./update-role.js";

export function registerProjectCommands(): ElnoraCommand[] {
	return [
		projectsList,
		projectsGet,
		projectsCreate,
		projectsUpdate,
		projectsArchive,
		projectsMembers,
		projectsAddMember,
		projectsUpdateRole,
		projectsRemoveMember,
		projectsLeave,
	];
}

export {
	projectsAddMember,
	projectsArchive,
	projectsCreate,
	projectsGet,
	projectsLeave,
	projectsList,
	projectsMembers,
	projectsRemoveMember,
	projectsUpdate,
	projectsUpdateRole,
};
