/**
 * API configuration — endpoints, headers, limits.
 *
 * Port of: elnora-cli/src/elnora/lib/config.py (105 lines)
 */

/**
 * Version is injected at build time by esbuild --define.
 * In dev mode (tsx), __APP_VERSION__ is undefined so we fall back
 * to the npm_package_version env var set by pnpm/npm.
 */
declare const __APP_VERSION__: string;

export const VERSION: string =
	typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : (process.env.npm_package_version ?? "0.0.0-dev");
export const BASE_URL = "https://platform.elnora.ai/api/v1";
export const AI_SERVER_URL = process.env.ELNORA_AI_SERVER_URL ?? "https://platform.elnora.ai/ai-server";

export const ENDPOINTS: Record<string, string> = {
	// Projects
	projects: "/projects",
	project: "/projects/{id}",
	project_tasks: "/projects/{id}/tasks",
	project_files: "/projects/{id}/files",
	project_folders: "/projects/{id}/folders",
	project_members: "/projects/{id}/members",
	project_member_role: "/projects/{id}/members/{uid}/role",
	project_member: "/projects/{id}/members/{uid}",
	project_leave: "/projects/{id}/leave",
	// Tasks
	tasks: "/tasks",
	task: "/tasks/{id}",
	task_messages: "/tasks/{id}/messages",
	// Files
	files: "/files",
	file: "/files/{id}",
	file_content: "/files/{id}/content",
	file_download: "/files/{id}/download",
	file_upload: "/files/upload",
	file_upload_confirm: "/files/{id}/upload/confirm",
	file_versions: "/files/{id}/versions",
	file_version_content: "/files/{id}/versions/{vid}/content",
	file_version_restore: "/files/{id}/versions/{vid}/restore",
	file_promote: "/files/{id}/promote",
	file_fork: "/files/{id}/fork",
	file_working_copy: "/files/{id}/working-copy",
	file_commit: "/files/{id}/commit",
	file_upload_batch: "/files/upload/batch",
	// Folders
	folder: "/folders/{id}",
	folder_move: "/folders/{id}/move",
	// Organizations
	organizations: "/organizations",
	organization: "/organizations/{id}",
	organization_members: "/organizations/{id}/members",
	organization_member_role: "/organizations/{id}/members/{mid}/role",
	organization_member: "/organizations/{id}/members/{mid}",
	organization_billing: "/organizations/{id}/billing-status",
	organization_stripe_customer: "/organizations/{id}/stripe-customer",
	organization_set_default: "/organizations/{id}/set-default",
	organizations_all: "/organizations/all",
	org_files: "/organizations/{orgId}/files",
	// Organization invitations
	org_invitations: "/organizations/{orgId}/invitations",
	org_invitation: "/organizations/{orgId}/invitations/{invId}",
	org_invitation_resend: "/organizations/{orgId}/invitations/{invId}/resend",
	// Public invitations
	invitation_info: "/invitations/{token}",
	invitation_accept: "/invitations/{token}/accept",
	// Organization library
	library_files: "/organizations/{orgId}/library/files",
	library_folders: "/organizations/{orgId}/library/folders",
	library_folder: "/organizations/{orgId}/library/folders/{id}",
	// Search
	search_tasks: "/search/tasks",
	search_files: "/search/files",
	search_all: "/search",
	search_file_content: "/search/file-content",
	// API Keys
	api_keys: "/api-keys",
	api_key: "/api-keys/{id}",
	api_key_policy: "/api-keys/policy",
	// Audit
	audit_log: "/organizations/{orgId}/audit-log",
	// Feedback
	feedback: "/feedback",
	// Account
	account_user: "/account/user/{id}",
	account_delete: "/account/me",
	account_users: "/account/user/list",
	// User agreements
	user_agreements: "/userAgreement/userAgreements",
	user_agreement: "/userAgreement/userAgreement",
	// Legal docs (anonymous)
	legal_doc_version: "/userAgreement/legalDocumentVersion",
	legal_doc_version_id: "/userAgreement/legalDocumentVersion/{id}",
	// Feature flags (SystemAdmin)
	feature_flags: "/globalFeatureFlags",
	feature_flag: "/globalFeatureFlags/{key}",
	// Auth
	auth_validate: "/auth/validate-token",
	// Health (outside /api/v1 prefix — handled specially by buildUrl)
	health: "/health",
};

export const DEFAULT_HEADERS: Record<string, string> = {
	"Content-Type": "application/json",
	Accept: "application/json",
	"User-Agent": `Elnora-CLI/${VERSION}`,
};

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Build a full URL from an endpoint key and template variables.
 *
 * Example: buildUrl("project", { id: "abc" }) → "https://platform.elnora.ai/api/v1/projects/abc"
 */
export function buildUrl(endpointKey: string, params?: Record<string, string>, baseUrl?: string): string {
	const path = ENDPOINTS[endpointKey];
	if (!path) throw new Error(`Unknown endpoint: ${endpointKey}`);

	let resolved = path;
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			resolved = resolved.replace(`{${key}}`, value);
		}
	}

	return `${baseUrl ?? BASE_URL}${resolved}`;
}
