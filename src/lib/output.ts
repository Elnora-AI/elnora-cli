/**
 * Output formatting — JSON, CSV, compact modes with field filtering.
 *
 * Port of: elnora-cli/src/elnora/lib/errors.py output_success (lines 99-174)
 */

import { scrubData } from "./errors.js";

export type OutputFormat = "json" | "csv" | "compact" | "table" | "md";

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

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function mdEscapeCell(v: unknown): string {
	if (v === null || v === undefined) return "";
	let s: string;
	if (typeof v === "object") {
		s = JSON.stringify(v);
	} else {
		s = String(v);
	}
	// Escape pipes, collapse newlines to spaces, trim
	return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function formatAsMarkdown(data: unknown): string {
	// String → pass through unchanged
	if (typeof data === "string") return data;
	// null / undefined
	if (data === null || data === undefined) return String(data);
	// Primitive (number, boolean)
	if (typeof data !== "object") return String(data);

	// Unwrap { items: [...] } envelopes (paginated list responses)
	let rows: unknown;
	if (isPlainObject(data) && "items" in data && Array.isArray(data.items)) {
		rows = data.items;
	} else {
		rows = data;
	}

	// Empty array → explicit empty marker
	if (Array.isArray(rows) && rows.length === 0) return "_(empty)_";

	// Array of plain objects → markdown table
	if (Array.isArray(rows) && rows.every(isPlainObject)) {
		const keys: string[] = [];
		const seen = new Set<string>();
		for (const row of rows as Record<string, unknown>[]) {
			for (const k of Object.keys(row)) {
				if (!seen.has(k)) {
					keys.push(k);
					seen.add(k);
				}
			}
		}
		const header = `| ${keys.join(" | ")} |`;
		const sep = `| ${keys.map(() => "---").join(" | ")} |`;
		const body = (rows as Record<string, unknown>[])
			.map((row) => `| ${keys.map((k) => mdEscapeCell(row[k])).join(" | ")} |`)
			.join("\n");
		return `${header}\n${sep}\n${body}`;
	}

	// Array of mixed / primitive values
	if (Array.isArray(rows)) {
		return rows.map((v) => `- ${mdEscapeCell(v)}`).join("\n");
	}

	// Single plain object → key/value list
	if (isPlainObject(rows)) {
		return Object.entries(rows)
			.map(([k, v]) => {
				const rendered = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
				return `- **${k}**: ${rendered}`;
			})
			.join("\n");
	}

	return String(rows);
}

export function formatOutput(data: unknown, options: OutputOptions): string {
	let output = scrubData(data);

	if (options.fields) {
		output = filterFields(output, options.fields);
	}

	if (options.format === "csv") {
		return toCsv(toRows(output));
	}

	if (options.format === "md") {
		return formatAsMarkdown(output);
	}

	// JSON
	if (options.compact) {
		return JSON.stringify(output);
	}
	return JSON.stringify(output, null, 2);
}
