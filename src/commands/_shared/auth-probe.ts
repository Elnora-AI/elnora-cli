/**
 * Shared authentication probe.
 *
 * Every authenticated caller belongs to at least one organization, so
 * `GET /organizations` doubles as a cheap "is this key still good?" check.
 *
 * It replaces the retired `GET /projects` shim (ELN-880/881). That shim was
 * removed from the platform in #213, but only `doctor` was migrated — `auth
 * login` and `auth status` kept calling it and have returned NOT_FOUND ever
 * since. Keep this the single implementation so the next migration cannot
 * leave one caller behind.
 */
import type { ElnoraApiClient } from "../../lib/client.js";

type OrganizationsResponse = { items?: unknown[]; totalCount?: number } | unknown[];

/** Verify the client's credential and return how many organizations it can see. */
export async function probeOrganizationCount(client: ElnoraApiClient): Promise<number> {
	const orgs = await client.get<OrganizationsResponse>("organizations");
	if (Array.isArray(orgs)) return orgs.length;
	return orgs?.totalCount ?? orgs?.items?.length ?? 0;
}
