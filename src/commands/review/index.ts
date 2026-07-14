import type { ElnoraCommand } from "../../core/command.js";
import { reviewApprove } from "./approve.js";
import { reviewList } from "./list.js";
import { reviewReject } from "./reject.js";

export function registerReviewCommands(): ElnoraCommand[] {
	return [reviewList, reviewApprove, reviewReject];
}

export { reviewApprove, reviewList, reviewReject };
