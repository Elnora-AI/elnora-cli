/**
 * Output formatting — JSON, CSV, compact modes with field filtering.
 *
 * Port of: elnora-cli/src/elnora/lib/errors.py output_success (lines 99-174)
 */

import { scrubData } from "./errors.js";

export type OutputFormat = "json" | "csv" | "compact" | "table" | "markdown";

export interface OutputOptions {
	format: OutputFormat;
	compact?: boolean;
	fields?: string[];
}

export function filterFields(data: unknown, fields: string[]): unknown {
	if (Array.isArray(data)) {
		return data.map((row) => {
			if (typeof row !== "object" || row === null) return row;
			const filtered: Record<string, unknown> = {};
			for (const f of fields) {
				if (f in row) filtered[f] = (row as Record<string, unknown>)[f];
			}
			return filtered;
		});
	}
	if (typeof data === "object" && data !== null) {
		const obj = data as Record<string, unknown>;
		if ("items" in obj && Array.isArray(obj.items)) {
			return { ...obj, items: filterFields(obj.items, fields) };
		}
		const filtered: Record<string, unknown> = {};
		for (const f of fields) {
			if (f in obj) filtered[f] = obj[f];
		}
		return filtered;
	}
	return data;
}

function toRows(data: unknown): Record<string, unknown>[] {
	if (Array.isArray(data)) return data;
	if (typeof data === "object" && data !== null) {
		const obj = data as Record<string, unknown>;
		if ("items" in obj && Array.isArray(obj.items)) return obj.items;
		return [obj];
	}
	return [{ value: data }];
}

function toCsv(rows: Record<string, unknown>[]): string {
	if (rows.length === 0) return "";
	const keys: string[] = [];
	const seen = new Set<string>();
	for (const row of rows) {
		for (const k of Object.keys(row)) {
			if (!seen.has(k)) {
				keys.push(k);
				seen.add(k);
			}
		}
	}
	const csvEscape = (v: unknown): string => {
		const s = String(v ?? "");
		return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
	};
	const lines = [keys.join(",")];
	for (const row of rows) {
		lines.push(keys.map((k) => csvEscape(row[k])).join(","));
	}
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Human-readable renderers (table = the interactive/TTY default; markdown for
// agent/chat consumption). These run AFTER scrubData + filterFields, so secret
// scrubbing and field selection apply uniformly across every format.
// ---------------------------------------------------------------------------

const MAX_CELL_WIDTH = 120;

/** Render a cell value as a single-line string (objects → compact JSON). */
function cellString(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "object") {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}
	return String(value);
}

/** Collapse newlines and clip overly long cells so terminal tables stay readable. */
function clipCell(value: unknown, max = MAX_CELL_WIDTH): string {
	const oneLine = cellString(value).replace(/\r?\n/g, " ");
	return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

/** True when the data is a collection (array, or an object with an `items` array). */
function isListShape(data: unknown): boolean {
	if (Array.isArray(data)) return true;
	if (typeof data === "object" && data !== null) {
		const obj = data as Record<string, unknown>;
		return "items" in obj && Array.isArray(obj.items);
	}
	return false;
}

/** Normalize rows so scalar elements still render as a single `value` column. */
function normalizedRows(data: unknown): Record<string, unknown>[] {
	return toRows(data).map((r) => (r !== null && typeof r === "object" && !Array.isArray(r) ? r : { value: r }));
}

function unionKeys(rows: Record<string, unknown>[]): string[] {
	const keys: string[] = [];
	const seen = new Set<string>();
	for (const row of rows) {
		for (const k of Object.keys(row)) {
			if (!seen.has(k)) {
				keys.push(k);
				seen.add(k);
			}
		}
	}
	return keys;
}

/**
 * Scalar sibling fields beside an `items` array (page, totalCount, nextCursor…).
 * Surfaced as a footer so the human formats don't hide pagination context.
 */
function listMeta(data: unknown): [string, unknown][] {
	if (data !== null && typeof data === "object" && !Array.isArray(data)) {
		const obj = data as Record<string, unknown>;
		if (Array.isArray(obj.items)) {
			return Object.entries(obj).filter(([k, v]) => k !== "items" && (v === null || typeof v !== "object"));
		}
	}
	return [];
}

/** Aligned plain-text table (lists) or key/value block (single object). */
function toTable(data: unknown): string {
	// Raw text passthrough (e.g. file content) — never box terminal-ready text.
	if (typeof data === "string") return data;

	if (!isListShape(data) && typeof data === "object" && data !== null) {
		const entries = Object.entries(data as Record<string, unknown>);
		if (entries.length === 0) return "(empty)";
		const keyWidth = Math.max(...entries.map(([k]) => k.length));
		return entries.map(([k, v]) => `${k.padEnd(keyWidth)}  ${clipCell(v)}`).join("\n");
	}

	const rows = normalizedRows(data);
	if (rows.length === 0) return "No results.";
	const keys = unionKeys(rows);
	if (keys.length === 0) return "No results.";
	const widths = keys.map((k) => Math.max(k.length, ...rows.map((r) => clipCell(r[k]).length)));
	const renderRow = (vals: string[]) =>
		vals
			.map((v, i) => v.padEnd(widths[i]))
			.join("  ")
			.replace(/\s+$/, "");
	const header = renderRow(keys);
	const sep = widths.map((w) => "-".repeat(w)).join("  ");
	const body = rows.map((r) => renderRow(keys.map((k) => clipCell(r[k]))));
	const table = [header, sep, ...body].join("\n");
	const meta = listMeta(data);
	return meta.length === 0 ? table : `${table}\n\n${meta.map(([k, v]) => `${k}=${clipCell(v)}`).join("  ")}`;
}

/** Escape a value for a GitHub-flavored markdown table cell. */
function mdCell(value: unknown): string {
	// Escape backslashes first, then pipes, so an input backslash can't combine
	// with the escape we add (correct, complete escaping order).
	return cellString(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** GitHub-flavored markdown: pipe table for lists, headed key/value for objects. */
function toMarkdown(data: unknown): string {
	if (typeof data === "string") return data;

	if (!isListShape(data) && typeof data === "object" && data !== null) {
		const entries = Object.entries(data as Record<string, unknown>);
		if (entries.length === 0) return "_(empty)_";
		return entries.map(([k, v]) => `**${k}:** ${mdCell(v)}`).join("\n");
	}

	const rows = normalizedRows(data);
	if (rows.length === 0) return "_No results._";
	const keys = unionKeys(rows);
	if (keys.length === 0) return "_No results._";
	const head = `| ${keys.join(" | ")} |`;
	const divider = `| ${keys.map(() => "---").join(" | ")} |`;
	const body = rows.map((r) => `| ${keys.map((k) => mdCell(r[k])).join(" | ")} |`);
	const table = [head, divider, ...body].join("\n");
	const meta = listMeta(data);
	return meta.length === 0 ? table : `${table}\n\n_${meta.map(([k, v]) => `${k}: ${mdCell(v)}`).join(", ")}_`;
}

export function formatOutput(data: unknown, options: OutputOptions): string {
	// A raw top-level string (e.g. file content) passes through unscrubbed, matching
	// the bespoke/--json path — never redact a user's own file content, and keep
	// every output format byte-identical for raw content. Objects/arrays are still
	// recursively scrubbed for credentials.
	let output = typeof data === "string" ? data : scrubData(data);

	if (options.fields) {
		output = filterFields(output, options.fields);
	}

	switch (options.format) {
		case "csv":
			return toCsv(toRows(output));
		case "table":
			return toTable(output);
		case "markdown":
			return toMarkdown(output);
		default:
			// JSON (and the legacy "compact" format alias)
			return options.compact ? JSON.stringify(output) : JSON.stringify(output, null, 2);
	}
}
