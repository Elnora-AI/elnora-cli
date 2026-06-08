import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { isColorEnabled, resolveDefaultFormat } from "../../src/lib/tty.js";

const ENV_KEYS = ["NO_COLOR", "FORCE_COLOR", "TERM"] as const;

function setTTY(value: boolean) {
	Object.defineProperty(process.stdout, "isTTY", { value, configurable: true });
}

describe("resolveDefaultFormat", () => {
	const orig = process.stdout.isTTY;
	afterEach(() => {
		Object.defineProperty(process.stdout, "isTTY", { value: orig, configurable: true });
	});

	test("table on an interactive terminal", () => {
		setTTY(true);
		expect(resolveDefaultFormat()).toBe("table");
	});

	test("json when piped/redirected (non-TTY) — keeps pipes/agents on JSON", () => {
		setTTY(false);
		expect(resolveDefaultFormat()).toBe("json");
	});
});

describe("isColorEnabled", () => {
	const origTTY = process.stdout.isTTY;
	const saved: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const k of ENV_KEYS) {
			saved[k] = process.env[k];
			delete process.env[k];
		}
	});
	afterEach(() => {
		for (const k of ENV_KEYS) {
			if (saved[k] === undefined) delete process.env[k];
			else process.env[k] = saved[k];
		}
		Object.defineProperty(process.stdout, "isTTY", { value: origTTY, configurable: true });
	});

	test("NO_COLOR wins over FORCE_COLOR (the path --no-color uses via the env shim)", () => {
		process.env.FORCE_COLOR = "1";
		process.env.NO_COLOR = "1";
		expect(isColorEnabled()).toBe(false);
	});

	test("NO_COLOR (non-empty) disables color", () => {
		process.env.NO_COLOR = "1";
		expect(isColorEnabled()).toBe(false);
	});

	test("empty NO_COLOR does NOT disable color", () => {
		process.env.NO_COLOR = "";
		setTTY(true);
		expect(isColorEnabled()).toBe(true);
	});

	test("FORCE_COLOR enables color even when non-TTY", () => {
		process.env.FORCE_COLOR = "1";
		setTTY(false);
		expect(isColorEnabled()).toBe(true);
	});

	test("TERM=dumb disables color", () => {
		process.env.TERM = "dumb";
		setTTY(true);
		expect(isColorEnabled()).toBe(false);
	});

	test("defaults to stdout TTY state", () => {
		setTTY(true);
		expect(isColorEnabled()).toBe(true);
		setTTY(false);
		expect(isColorEnabled()).toBe(false);
	});
});
