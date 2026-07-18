/**
 * Deprecation helper for the `projects` command group and the legacy
 * project-scoped folder paths.
 *
 * The Elnora platform removed the "project" concept (ELN-880/881). These
 * commands stay registered — same names and input schemas, so the CLI↔MCP
 * parity gate and any existing scripts/aliases keep resolving — but they no
 * longer call the retired `/projects` compat shim. They return a structured
 * no-op notice instead. Scheduled for full removal in a future major release.
 */
export const PROJECTS_REMOVED_MESSAGE =
	"Projects were removed from the Elnora platform. Use tasks, folders, and the Knowledge Base instead. This command is a deprecated no-op and will be removed in a future release.";

/** A structured, backend-free deprecation result. */
export function projectsRemoved(
	extra?: Record<string, unknown>,
): { deprecated: true; message: string } & Record<string, unknown> {
	return { deprecated: true, message: PROJECTS_REMOVED_MESSAGE, ...extra };
}
