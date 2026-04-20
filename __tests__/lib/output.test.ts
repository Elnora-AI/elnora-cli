import { describe, expect, test } from "vitest";
import { filterFields, formatOutput } from "../../src/lib/output.js";

describe("filterFields", () => {
	test("filters object to selected fields", () => {
		const data = { id: "1", name: "Test", description: "Long text", status: "active" };
		expect(filterFields(data, ["id", "name"])).toEqual({ id: "1", name: "Test" });
	});

	test("filters array of objects", () => {
		const data = [
			{ id: "1", name: "A", extra: "x" },
			{ id: "2", name: "B", extra: "y" },
		];
		expect(filterFields(data, ["id"])).toEqual([{ id: "1" }, { id: "2" }]);
	});

	test("handles items wrapper", () => {
		const data = { items: [{ id: "1", name: "A" }], total: 1 };
		const result = filterFields(data, ["id"]) as { items: unknown[]; total: number };
		expect(result.items).toEqual([{ id: "1" }]);
		expect(result.total).toBe(1);
	});

	test("ignores missing fields", () => {
		const data = { id: "1", name: "Test" };
		expect(filterFields(data, ["id", "nonexistent"])).toEqual({ id: "1" });
	});

	test("returns primitives unchanged", () => {
		expect(filterFields(42, ["id"])).toBe(42);
		expect(filterFields(null, ["id"])).toBe(null);
	});
});

describe("formatOutput", () => {
	test("json format — pretty printed", () => {
		const result = formatOutput({ id: "1" }, { format: "json" });
		expect(JSON.parse(result)).toEqual({ id: "1" });
		expect(result).toContain("\n"); // pretty printed
	});

	test("compact json — no whitespace", () => {
		const result = formatOutput({ id: "1", name: "Test" }, { format: "json", compact: true });
		expect(result).not.toContain("\n");
		expect(result).not.toContain("  ");
		expect(JSON.parse(result)).toEqual({ id: "1", name: "Test" });
	});

	test("csv format for array", () => {
		const result = formatOutput(
			[
				{ id: "1", name: "A" },
				{ id: "2", name: "B" },
			],
			{ format: "csv" },
		);
		expect(result).toContain("id,name");
		expect(result).toContain("1,A");
		expect(result).toContain("2,B");
	});

	test("csv format escapes commas", () => {
		const result = formatOutput([{ name: "foo, bar" }], { format: "csv" });
		expect(result).toContain('"foo, bar"');
	});

	test("csv format handles items wrapper", () => {
		const result = formatOutput({ items: [{ id: "1" }], total: 1 }, { format: "csv" });
		expect(result).toContain("id");
		expect(result).toContain("1");
	});

	test("applies field filtering", () => {
		const result = formatOutput(
			{ id: "1", name: "Test", secret: "hidden" },
			{ format: "json", fields: ["id", "name"] },
		);
		const parsed = JSON.parse(result);
		expect(parsed.id).toBe("1");
		expect(parsed.name).toBe("Test");
		expect(parsed.secret).toBeUndefined();
	});

	test("scrubs credentials in output", () => {
		const result = formatOutput({ key: "elnora_live_orgA_abcdefgh12345678" }, { format: "json" });
		expect(result).toContain("[REDACTED]");
		expect(result).not.toContain("elnora_live_");
	});

	test("csv returns empty for empty array", () => {
		const result = formatOutput([], { format: "csv" });
		expect(result).toBe("");
	});
});

describe("markdown format", () => {
	test("array of plain objects renders as markdown table", () => {
		const result = formatOutput(
			[
				{ id: "1", name: "A" },
				{ id: "2", name: "B" },
			],
			{ format: "md" },
		);
		expect(result).toContain("| id | name |");
		expect(result).toContain("| --- | --- |");
		expect(result).toContain("| 1 | A |");
		expect(result).toContain("| 2 | B |");
	});

	test("items wrapper unwraps for table rendering", () => {
		const result = formatOutput(
			{ items: [{ id: "1", name: "A" }], totalCount: 1, page: 1 },
			{ format: "md" },
		);
		expect(result).toContain("| id | name |");
		expect(result).toContain("| 1 | A |");
		// envelope fields should NOT leak into the table
		expect(result).not.toContain("totalCount");
		expect(result).not.toContain("page");
	});

	test("single plain object renders as key/value list", () => {
		const result = formatOutput({ id: "1", name: "Test" }, { format: "md" });
		expect(result).toContain("- **id**: 1");
		expect(result).toContain("- **name**: Test");
	});

	test("string passes through unchanged", () => {
		const result = formatOutput("raw markdown text", { format: "md" });
		expect(result).toBe("raw markdown text");
	});

	test("empty array renders as _(empty)_", () => {
		expect(formatOutput([], { format: "md" })).toBe("_(empty)_");
	});

	test("escapes pipes in cells", () => {
		const result = formatOutput([{ name: "foo | bar" }], { format: "md" });
		expect(result).toContain("foo \\| bar");
	});

	test("collapses newlines in cells", () => {
		const result = formatOutput([{ name: "foo\nbar" }], { format: "md" });
		// newline replaced with space
		expect(result).toContain("foo bar");
		expect(result).not.toContain("foo\nbar");
	});

	test("field filtering applies to md format", () => {
		const result = formatOutput(
			[
				{ id: "1", name: "A", secret: "x" },
				{ id: "2", name: "B", secret: "y" },
			],
			{ format: "md", fields: ["id", "name"] },
		);
		expect(result).toContain("| id | name |");
		expect(result).not.toContain("secret");
		expect(result).not.toContain(" x ");
	});

	test("credential scrubbing applies to md format", () => {
		const result = formatOutput(
			[{ key: "elnora_live_orgA_abcdefgh12345678" }],
			{ format: "md" },
		);
		expect(result).toContain("[REDACTED]");
		expect(result).not.toContain("elnora_live_");
	});

	test("nested object in cell is inline JSON", () => {
		const result = formatOutput(
			[{ id: "1", meta: { key: "v" } }],
			{ format: "md" },
		);
		expect(result).toContain('{"key":"v"}');
	});

	test("null / undefined primitives render as strings", () => {
		expect(formatOutput(null, { format: "md" })).toBe("null");
		expect(formatOutput(undefined, { format: "md" })).toBe("undefined");
	});

	test("array of primitives renders as bullet list", () => {
		const result = formatOutput(["foo", "bar", "baz"], { format: "md" });
		expect(result).toContain("- foo");
		expect(result).toContain("- bar");
		expect(result).toContain("- baz");
	});

	test("nested object value in single-object md list uses JSON", () => {
		const result = formatOutput({ id: "1", metadata: { a: 1 } }, { format: "md" });
		expect(result).toContain("- **id**: 1");
		expect(result).toContain('{"a":1}');
	});
});
