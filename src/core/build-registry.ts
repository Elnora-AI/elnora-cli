/**
 * Single source of truth for assembling the CLI command registry.
 *
 * Used by:
 *   - src/cli.ts — at runtime to build the Commander program
 *   - scripts/audit-mcp-parity.ts — to enumerate commands for MCP parity checks
 *
 * If you add a new command group, register it here in the same style.
 */

import { registerAccountCommands } from "../commands/account/index.js";
import { registerApiKeyCommands } from "../commands/api-keys/index.js";
import { registerAuditCommands } from "../commands/audit/index.js";
import { registerAuthCommands } from "../commands/auth/index.js";
import { registerFeedbackCommands } from "../commands/feedback/index.js";
import { registerFileCommands } from "../commands/files/index.js";
import { registerFlagCommands } from "../commands/flags/index.js";
import { registerFolderCommands } from "../commands/folders/index.js";
import { healthCheck } from "../commands/health.js";
import { registerLibraryCommands } from "../commands/library/index.js";
import { registerOrgCommands } from "../commands/orgs/index.js";
import { registerProjectCommands } from "../commands/projects/index.js";
import { registerProtocolCommands } from "../commands/protocols/index.js";
import { registerSearchCommands } from "../commands/search/index.js";
import { registerTaskCommands } from "../commands/tasks/index.js";
import { CommandRegistry } from "./registry.js";

export function buildRegistry(): CommandRegistry {
	const registry = new CommandRegistry();

	const commandGroups = [
		[healthCheck],
		registerAuthCommands(),
		registerProjectCommands(),
		registerTaskCommands(),
		registerFileCommands(),
		registerOrgCommands(),
		registerFolderCommands(),
		registerSearchCommands(),
		registerProtocolCommands(),
		registerLibraryCommands(),
		registerAccountCommands(),
		registerApiKeyCommands(),
		registerAuditCommands(),
		registerFeedbackCommands(),
		registerFlagCommands(),
	];

	for (const commands of commandGroups) {
		for (const cmd of commands) {
			registry.register(cmd);
		}
	}

	return registry;
}
