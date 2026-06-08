import { PassThrough } from "node:stream";
import { afterEach, describe, expect, test } from "vitest";
import { readStdin } from "../../src/lib/stdin.js";

const realStdin = process.stdin;

function useFakeStdin(isTTY: boolean): PassThrough & { isTTY?: boolean } {
	const fake = new PassThrough() as PassThrough & { isTTY?: boolean };
	fake.isTTY = isTTY;
	Object.defineProperty(process, "stdin", { value: fake, configurable: true });
	return fake;
}

describe("readStdin", () => {
	afterEach(() => {
		Object.defineProperty(process, "stdin", { value: realStdin, configurable: true });
	});

	test("resolves '' immediately when stdin is a TTY (no hang)", async () => {
		useFakeStdin(true);
		await expect(readStdin()).resolves.toBe("");
	});

	test("accumulates piped chunks until end", async () => {
		const fake = useFakeStdin(false);
		const p = readStdin();
		fake.write("abc");
		fake.write("def");
		fake.end();
		await expect(p).resolves.toBe("abcdef");
	});

	test("decodes a multi-byte UTF-8 char split across chunks", async () => {
		const fake = useFakeStdin(false);
		const p = readStdin();
		// "é" = 0xC3 0xA9, delivered one byte at a time.
		fake.write(Buffer.from([0xc3]));
		fake.write(Buffer.from([0xa9]));
		fake.end();
		await expect(p).resolves.toBe("é");
	});

	test("rejects on a stream error", async () => {
		const fake = useFakeStdin(false);
		const p = readStdin();
		fake.emit("error", new Error("boom"));
		await expect(p).rejects.toThrow("boom");
	});
});
