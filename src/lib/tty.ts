/** TTY detection for output mode decisions. */

import type { OutputFormat } from "./output.js";

export function isTTY(): boolean {
	return Boolean(process.stdout.isTTY);
}

/**
 * Color resolution, independent of the data format (clig.dev: resolve color and
 * format on separate axes). Precedence: NO_COLOR (set and non-empty) > FORCE_COLOR
 * > TERM=dumb (off) > stdout is a TTY.
 *
 * The global `--no-color` flag is handled in the CLI entrypoint by setting
 * `NO_COLOR` before parse (src/cli.ts), so it flows through the NO_COLOR branch
 * here without every call site needing to thread the flag.
 */
export function isColorEnabled(): boolean {
	// NO_COLOR: any non-empty value disables color (https://no-color.org).
	if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
	if (process.env.FORCE_COLOR !== undefined) return true;
	if (process.env.TERM === "dumb") return false;
	return isTTY();
}

/**
 * The default output format when the user passes no explicit format flag:
 * human-readable `table` in an interactive terminal, machine `json` when the
 * output is piped/redirected (non-TTY) — so scripts and agents are unaffected.
 * Centralized here so the rule lives in one testable place.
 */
export function resolveDefaultFormat(): OutputFormat {
	return isTTY() ? "table" : "json";
}
