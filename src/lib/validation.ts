/**
 * Input validation — GUID format, page size bounds, path safety.
 *
 * Port of: elnora-cli/src/elnora/lib/validation.py (89 lines)
 */

import { MAX_PAGE_SIZE } from "./config.js";
import { ValidationError } from "./errors.js";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map validation labels to CLI list commands for helpful suggestions. */
const LABEL_TO_COMMAND: Record<string, string> = {
	project_id: "elnora projects list",
	project: "elnora projects list",
	task_id: "elnora tasks list",
	file_id: "elnora files list --project <PROJECT_ID>",
	file_ref: "elnora files list --project <PROJECT_ID>",
	org_id: "elnora orgs list",
	org: "elnora orgs list",
	folder_id: "elnora folders list --project <PROJECT_ID>",
	folder: "elnora folders list --project <PROJECT_ID>",
	membership_id: "elnora orgs members <ORG_ID>",
	invitation_id: "elnora orgs invitations <ORG_ID>",
	user_id: "elnora account users",
	target_project: "elnora projects list",
	target_project_id: "elnora projects list",
	version_id: "elnora files versions <FILE_ID>",
	task: "elnora tasks list",
	key_id: "elnora api-keys list",
};

export function validateGuid(value: string, label: string): string {
	if (!GUID_RE.test(value)) {
		const suggestion = LABEL_TO_COMMAND[label] ?? `elnora ${label}s list`;
		throw new ValidationError(
			`Invalid ${label}: '${value}'. Expected UUID format (e.g., bfdc6fbd-40ed-4042-9ea7-c79a5ec90085).`,
			`Run: ${suggestion}`,
		);
	}
	return value;
}

export function validatePage(value: number): number {
	if (value < 1) {
		throw new ValidationError(`Invalid page: ${value}. Must be >= 1.`, "Use a positive page number.");
	}
	return value;
}

export function validatePageSize(value: number, label = "page size"): number {
	if (value < 1 || value > MAX_PAGE_SIZE) {
		throw new ValidationError(
			`Invalid ${label}: ${value}. Must be between 1 and ${MAX_PAGE_SIZE}.`,
			`Use a value between 1 and ${MAX_PAGE_SIZE}.`,
		);
	}
	return value;
}

const PATH_SAFE_RE = /^[a-zA-Z0-9_-]+$/;

export function validatePathSegment(value: string, label: string): string {
	if (!value || !PATH_SAFE_RE.test(value)) {
		throw new ValidationError(
			`Invalid ${label}: '${value}'. Must contain only alphanumeric characters, hyphens, and underscores.`,
			`Check the ${label} value and try again.`,
		);
	}
	return value;
}
