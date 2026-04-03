import { Command } from "commander";
import { describe, expect, test } from "vitest";
import { addDoctorCommand } from "../../src/commands/doctor.js";
import { addOpenCommand } from "../../src/commands/open.js";
import { addWhoamiCommand } from "../../src/commands/whoami.js";

describe("doctor command", () => {
	test("registers on program", () => {
		const program = new Command();
		addDoctorCommand(program);
		const cmd = program.commands.find((c) => c.name() === "doctor");
		expect(cmd).toBeDefined();
		expect(cmd?.description()).toContain("Check");
	});
});

describe("whoami command", () => {
	test("registers on program", () => {
		const program = new Command();
		addWhoamiCommand(program);
		const cmd = program.commands.find((c) => c.name() === "whoami");
		expect(cmd).toBeDefined();
	});
});

describe("open command", () => {
	test("registers on program", () => {
		const program = new Command();
		addOpenCommand(program);
		const cmd = program.commands.find((c) => c.name() === "open");
		expect(cmd).toBeDefined();
		expect(cmd?.description()).toContain("browser");
	});
});
