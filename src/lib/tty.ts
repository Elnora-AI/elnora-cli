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

/** True if the string contains a C0 control char (0x00–0x1F) or DEL (0x7F). */
export function hasControlChar(s: string): boolean {
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if (c < 0x20 || c === 0x7f) return true;
	}
	return false;
}

/** Remove C0 control chars and DEL from a string. */
function stripControlChars(s: string): string {
	let out = "";
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if (c >= 0x20 && c !== 0x7f) out += s[i];
	}
	return out;
}

/**
 * Wrap text in an OSC 8 hyperlink (clickable in modern terminals). Returns the
 * bare text when color/links are disabled (NO_COLOR, non-TTY, etc.) or the URL
 * is empty — so escape sequences never leak into piped or machine output. The
 * URL is stripped of control bytes (notably BEL/ESC) so a server-supplied value
 * can't break out of the OSC 8 sequence and inject terminal escape codes.
 */
export function hyperlink(url: string, text: string): string {
	if (!url || !isColorEnabled()) return text;
	const safeUrl = stripControlChars(url);
	if (!safeUrl) return text;
	return `\x1b]8;;${safeUrl}\x07${text}\x1b]8;;\x07`;
}
