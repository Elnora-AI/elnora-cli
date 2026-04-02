import { describe, expect, test } from "vitest";
import { formatOutput, filterFields } from "../../src/lib/output.js";

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
		const result = formatOutput({ id: "1", name: "Test", secret: "hidden" }, { format: "json", fields: ["id", "name"] });
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
