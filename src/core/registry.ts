/**
 * Command registry — collects all ElnoraCommand instances for adapter consumption.
 */

import type { ElnoraCommand } from "./command.js";

export class CommandRegistry {
	private commands = new Map<string, ElnoraCommand>();

	register(command: ElnoraCommand): void {
		if (this.commands.has(command.name)) {
			throw new Error(`Duplicate command: ${command.name}`);
		}
		this.commands.set(command.name, command);
	}

	get(name: string): ElnoraCommand | undefined {
		return this.commands.get(name);
	}

	all(): ElnoraCommand[] {
		return Array.from(this.commands.values());
	}

	byGroup(group: string): ElnoraCommand[] {
		return this.all().filter((cmd) => cmd.group === group);
	}

	groups(): string[] {
		const groups = new Set<string>();
		for (const cmd of this.commands.values()) {
			groups.add(cmd.group);
		}
		return Array.from(groups).sort();
	}
}
