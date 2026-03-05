"""Elnora API configuration — endpoints, headers, limits."""

from importlib.metadata import version

__version__ = version("elnora")

BASE_URL = "https://platform.elnora.ai/api/v1"

ENDPOINTS = {
    # Projects
    "projects": "/projects",
    "project": "/projects/{id}",
    "project_tasks": "/projects/{id}/tasks",
    "project_files": "/projects/{id}/files",
    "project_folders": "/projects/{id}/folders",
    "project_members": "/projects/{id}/members",
    "project_member_role": "/projects/{id}/members/{uid}/role",
    "project_member": "/projects/{id}/members/{uid}",
    "project_leave": "/projects/{id}/leave",
    # Tasks
    "tasks": "/tasks",
    "task": "/tasks/{id}",
    "task_messages": "/tasks/{id}/messages",
    # Files
    "files": "/files",
    "file": "/files/{id}",
    "file_content": "/files/{id}/content",
    "file_download": "/files/{id}/download",
    "file_upload": "/files/upload",
    "file_upload_confirm": "/files/{id}/upload/confirm",
    "file_versions": "/files/{id}/versions",
    "file_version_content": "/files/{id}/versions/{vid}/content",
    "file_version_restore": "/files/{id}/versions/{vid}/restore",
    "file_promote": "/files/{id}/promote",
    "file_fork": "/files/{id}/fork",
    "file_working_copy": "/files/{id}/working-copy",
    "file_commit": "/files/{id}/commit",
    # Folders
    "folder": "/folders/{id}",
    "folder_move": "/folders/{id}/move",
    # Organizations
    "organizations": "/organizations",
    "organization": "/organizations/{id}",
    "organization_members": "/organizations/{id}/members",
    "organization_member_role": "/organizations/{id}/members/{mid}/role",
    "organization_member": "/organizations/{id}/members/{mid}",
    "organization_billing": "/organizations/{id}/billing-status",
    "org_files": "/organizations/{orgId}/files",
    # Organization invitations
    "org_invitations": "/organizations/{orgId}/invitations",
    "org_invitation": "/organizations/{orgId}/invitations/{invId}",
    # Public invitations
    "invitation_info": "/invitations/{token}",
    "invitation_accept": "/invitations/{token}/accept",
    # Organization library
    "library_files": "/organizations/{orgId}/library/files",
    "library_folders": "/organizations/{orgId}/library/folders",
    "library_folder": "/organizations/{orgId}/library/folders/{id}",
    # Search
    "search_tasks": "/search/tasks",
    "search_files": "/search/files",
    "search_all": "/search",
    # API Keys
    "api_keys": "/api-keys",
    "api_key": "/api-keys/{id}",
    # Audit
    "audit_log": "/organizations/{orgId}/audit-log",
    # Feedback
    "feedback": "/feedback",
    # Account
    "account_user": "/account/user/{id}",
    # User agreements
    "user_agreements": "/userAgreement/userAgreements",
    "user_agreement": "/userAgreement/userAgreement",
    # Feature flags (anonymous)
    "feature_flags": "/globalFeatureFlags",
    "feature_flag": "/globalFeatureFlags/{key}",
    # Legal docs (anonymous)
    "legal_docs": "/userAgreement/legalDocumentVersion/list",
    # Auth
    "auth_validate": "/auth/validate-token",
}

DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": f"Elnora-CLI/{__version__}",
}

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 25
