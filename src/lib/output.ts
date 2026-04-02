/**
 * Output formatting — JSON, CSV, compact modes with field filtering.
 *
 * Port of: elnora-cli/src/elnora/lib/errors.py output_success (lines 99-174)
 */

import { scrubData } from "./errors.js";

export type OutputFormat = "json" | "csv" | "compact" | "table";

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
	const escape = (v: unknown): string => {
		const s = String(v ?? "");
		return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
	};
	const lines = [keys.join(",")];
	for (const row of rows) {
		lines.push(keys.map((k) => escape(row[k])).join(","));
	}
	return lines.join("\n");
}

export function formatOutput(data: unknown, options: OutputOptions): string {
	let output = scrubData(data);

	if (options.fields) {
		output = filterFields(output, options.fields);
	}

	if (options.format === "csv") {
		return toCsv(toRows(output));
	}

	// JSON
	if (options.compact) {
		return JSON.stringify(output);
	}
	return JSON.stringify(output, null, 2);
}
