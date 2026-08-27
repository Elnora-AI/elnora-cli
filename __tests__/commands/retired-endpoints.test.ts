import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ENDPOINTS } from "../../src/lib/config.js";

/**
 * Guard against half-finished endpoint migrations.
 *
 * When the platform retired the `project` concept (ELN-880/881), #213 moved
 * `doctor` off `GET /projects` but left `auth login`, `auth status`,
 * `tasks list --project` and `files list --project` calling routes that no
 * longer exist. Every one of them returned NOT_FOUND in production while the
 * suite stayed green, because the unit tests mock the HTTP client and asserted
 * the *old* endpoint name — a mock will happily "return" from a route the
 * server deleted.
 *
 * These tests read the sources instead of mocking them, so a caller left
 * behind by the next migration fails here rather than in a user's terminal.
 */

const SRC_DIR = fileURLToPath(new URL("../../src", import.meta.url));

/** Endpoint keys whose paths the platform no longer serves. */
const RETIRED_ENDPOINT_KEYS = Object.keys(ENDPOINTS).filter((key) => ENDPOINTS[key].startsWith("/projects"));

function collectTsFiles(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) collectTsFiles(full, acc);
		else if (entry.endsWith(".ts")) acc.push(full);
	}
	return acc;
}

describe("retired /projects endpoints", () => {
	it("still knows which endpoint keys are retired", () => {
		// Sanity check: if the map is ever cleaned up, the scan below must not
		// silently degrade into asserting nothing.
		expect(RETIRED_ENDPOINT_KEYS).toContain("projects");
		expect(RETIRED_ENDPOINT_KEYS.length).toBeGreaterThanOrEqual(5);
	});

	it("is not called by any command", () => {
		const offenders: string[] = [];
		for (const file of collectTsFiles(SRC_DIR)) {
			const source = readFileSync(file, "utf-8");
			for (const key of RETIRED_ENDPOINT_KEYS) {
				// Matches client.get("projects", …) / .post(…) / .del(…) etc.
				const called = new RegExp(`\\.(get|post|put|patch|del)(<[^>]*>)?\\(\\s*["'\`]${key}["'\`]`);
				if (called.test(source)) offenders.push(`${file.slice(SRC_DIR.length + 1)} -> ${key}`);
			}
		}
		expect(offenders, `retired endpoints are still called:\n${offenders.join("\n")}`).toEqual([]);
	});

	it("is not reached through a hardcoded /projects path either", () => {
		const offenders: string[] = [];
		for (const file of collectTsFiles(SRC_DIR)) {
			if (file.endsWith(join("lib", "config.ts"))) continue; // the map itself
			const source = readFileSync(file, "utf-8");
			// client.get("/projects/…") bypasses ENDPOINTS entirely (see client.ts).
			if (/\.(get|post|put|patch|del)(<[^>]*>)?\(\s*["'`]\/projects/.test(source)) {
				offenders.push(file.slice(SRC_DIR.length + 1));
			}
		}
		expect(offenders, `hardcoded /projects paths:\n${offenders.join("\n")}`).toEqual([]);
	});
});
