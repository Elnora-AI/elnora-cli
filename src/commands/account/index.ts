import type { ElnoraCommand } from "../../core/command.js";
import { accountAcceptTerms } from "./accept-terms.js";
import { accountAddLegalDoc } from "./add-legal-doc.js";
import { accountAgreements } from "./agreements.js";
import { accountDelete } from "./delete.js";
import { accountDeleteLegalDoc } from "./delete-legal-doc.js";
import { accountGet } from "./get.js";
import { accountUpdate } from "./update.js";
import { accountUpdateLegalDoc } from "./update-legal-doc.js";
import { accountUsers } from "./users.js";

export function registerAccountCommands(): ElnoraCommand[] {
	return [
		accountGet,
		accountUpdate,
		accountAgreements,
		accountAcceptTerms,
		accountDelete,
		accountUsers,
		accountAddLegalDoc,
		accountUpdateLegalDoc,
		accountDeleteLegalDoc,
	];
}

export {
	accountAcceptTerms,
	accountAddLegalDoc,
	accountAgreements,
	accountDelete,
	accountDeleteLegalDoc,
	accountGet,
	accountUpdate,
	accountUpdateLegalDoc,
	accountUsers,
};
