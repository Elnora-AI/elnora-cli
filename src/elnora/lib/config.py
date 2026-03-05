"""Elnora API configuration — endpoints, headers, limits."""

from .. import __version__

BASE_URL = "https://platform.elnora.ai/api/v1"

ENDPOINTS = {
    "projects": "/projects",
    "project": "/projects/{id}",
    "project_tasks": "/projects/{id}/tasks",
    "project_files": "/projects/{id}/files",
    "tasks": "/tasks",
    "task": "/tasks/{id}",
    "task_messages": "/tasks/{id}/messages",
    "file": "/files/{id}",
    "file_content": "/files/{id}/content",
    "file_versions": "/files/{id}/versions",
    "search_tasks": "/search/tasks",
    "search_files": "/search/files",
}

DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": f"Elnora-CLI/{__version__}",
}

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 25
