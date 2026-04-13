import { describe, expect, test } from "vitest";
import { getUpdateInstruction } from "../../src/lib/install-method.js";

describe("getUpdateInstruction", () => {
	test("returns npm command for npm installs", () => {
		expect(getUpdateInstruction("npm")).toBe("npm install -g @elnora-ai/cli@latest");
	});

	test("returns brew command for homebrew installs", () => {
		expect(getUpdateInstruction("homebrew")).toBe("brew upgrade elnora");
	});

	test("returns elnora update --install for binary installs", () => {
		expect(getUpdateInstruction("binary")).toBe("elnora update --install");
	});
});
