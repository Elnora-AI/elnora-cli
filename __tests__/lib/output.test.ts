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

describe("table format", () => {
	test("renders an array as an aligned table with header + separator", () => {
		const result = formatOutput(
			[
				{ id: "1", name: "Alpha" },
				{ id: "22", name: "Beta" },
			],
			{ format: "table" },
		);
		const lines = result.split("\n");
		expect(lines[0]).toMatch(/^id\s+name$/);
		expect(lines[1]).toMatch(/^-+\s+-+$/);
		expect(lines[2]).toContain("Alpha");
		expect(lines[3]).toContain("Beta");
	});

	test("renders an items wrapper as a table with a metadata footer", () => {
		const result = formatOutput({ items: [{ id: "1", name: "A" }], totalCount: 99, page: 1 }, { format: "table" });
		expect(result).toContain("id");
		expect(result).toContain("name");
		// Sibling scalars (pagination context) surfaced in a footer, not dropped.
		expect(result).toContain("totalCount=99");
		expect(result).toContain("page=1");
	});

	test("raw string is not redacted (lossless file content)", () => {
		// A 40+ char alphanumeric-with-digit string would be scrubbed if treated as data.
		const content = "seqid_ABCDEFGHIJ0123456789KLMNOPQRSTUVWX42";
		expect(formatOutput(content, { format: "table" })).toBe(content);
		expect(formatOutput(content, { format: "json" })).toBe(JSON.stringify(content, null, 2));
	});

	test("renders a single object as a key/value block", () => {
		const result = formatOutput({ id: "1", name: "Test" }, { format: "table" });
		expect(result).toMatch(/id\s+1/);
		expect(result).toMatch(/name\s+Test/);
		expect(result).not.toContain("---"); // not a columnar table
	});

	test("empty list → No results.", () => {
		expect(formatOutput([], { format: "table" })).toBe("No results.");
	});

	test("raw string passes through unboxed", () => {
		expect(formatOutput("# A protocol\nstep 1", { format: "table" })).toBe("# A protocol\nstep 1");
	});

	test("still scrubs credentials", () => {
		const result = formatOutput([{ key: "elnora_live_orgA_abcdefgh12345678" }], { format: "table" });
		expect(result).toContain("[REDACTED]");
		expect(result).not.toContain("elnora_live_");
	});

	test("applies --fields before rendering", () => {
		const result = formatOutput([{ id: "1", name: "A", secret: "x" }], { format: "table", fields: ["id", "name"] });
		expect(result).toContain("name");
		expect(result).not.toContain("secret");
	});
});

describe("markdown format", () => {
	test("renders an array as a GitHub pipe table", () => {
		const result = formatOutput(
			[
				{ id: "1", name: "A" },
				{ id: "2", name: "B" },
			],
			{ format: "markdown" },
		);
		const lines = result.split("\n");
		expect(lines[0]).toBe("| id | name |");
		expect(lines[1]).toBe("| --- | --- |");
		expect(lines[2]).toBe("| 1 | A |");
	});

	test("renders a single object as headed key/value", () => {
		const result = formatOutput({ id: "1", name: "Test" }, { format: "markdown" });
		expect(result).toContain("**id:** 1");
		expect(result).toContain("**name:** Test");
	});

	test("escapes pipe characters in cells", () => {
		const result = formatOutput([{ name: "a|b" }], { format: "markdown" });
		expect(result).toContain("a\\|b");
	});

	test("escapes backslashes as well as pipes (complete escaping)", () => {
		const result = formatOutput([{ path: "a\\b|c" }], { format: "markdown" });
		// input a\b|c → a\\b\|c
		expect(result).toContain("a\\\\b\\|c");
	});

	test("empty list → italic No results", () => {
		expect(formatOutput([], { format: "markdown" })).toBe("_No results._");
	});
});
