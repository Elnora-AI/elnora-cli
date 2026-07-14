import type { ElnoraCommand } from "../../core/command.js";
import { orgsAcceptInvite } from "./accept-invite.js";
import { orgsBilling } from "./billing.js";
import { orgsCancelInvite } from "./cancel-invite.js";
import { orgsCreate } from "./create.js";
import { orgsDelete } from "./delete.js";
import { orgsDirectory } from "./directory.js";
import { orgsFiles } from "./files.js";
import { orgsGet } from "./get.js";
import { orgsInvitationInfo } from "./invitation-info.js";
import { orgsInvitations } from "./invitations.js";
import { orgsInvite } from "./invite.js";
import { orgsList } from "./list.js";
import { orgsListAll } from "./list-all.js";
import { orgsMembers } from "./members.js";
import { orgsRemoveMember } from "./remove-member.js";
import { orgsResendInvite } from "./resend-invite.js";
import { orgsSetDefault } from "./set-default.js";
import { orgsSetStripe } from "./set-stripe.js";
import { orgsUpdate } from "./update.js";
import { orgsUpdateRole } from "./update-role.js";

export function registerOrgCommands(): ElnoraCommand[] {
	return [
		orgsList,
		orgsGet,
		orgsCreate,
		orgsUpdate,
		orgsDelete,
		orgsMembers,
		orgsUpdateRole,
		orgsRemoveMember,
		orgsBilling,
		orgsSetStripe,
		orgsSetDefault,
		orgsInvite,
		orgsInvitations,
		orgsCancelInvite,
		orgsResendInvite,
		orgsInvitationInfo,
		orgsAcceptInvite,
		orgsFiles,
		orgsListAll,
		orgsDirectory,
	];
}

export {
	orgsAcceptInvite,
	orgsBilling,
	orgsCancelInvite,
	orgsCreate,
	orgsDelete,
	orgsDirectory,
	orgsFiles,
	orgsGet,
	orgsInvitationInfo,
	orgsInvitations,
	orgsInvite,
	orgsList,
	orgsListAll,
	orgsMembers,
	orgsRemoveMember,
	orgsResendInvite,
	orgsSetDefault,
	orgsSetStripe,
	orgsUpdate,
	orgsUpdateRole,
};
