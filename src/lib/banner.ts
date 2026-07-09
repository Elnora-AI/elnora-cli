/** Branded startup banner shown on bare `elnora` (and top-level --help). */

import pc from "picocolors";
import { VERSION } from "./config.js";
import { isColorEnabled } from "./tty.js";

/** The wordmark for the current color state. Pure — testable without streams. */
export function renderBanner(): string {
	const label = "ELNORA  ·  AI Platform CLI";
	const inner = `  ${label}  `;
	const bar = "─".repeat(inner.length);
	const box = [`┌${bar}┐`, `│${inner}│`, `└${bar}┘`].join("\n");
	const head = isColorEnabled() ? pc.cyan(box) : box;
	return `${head}\nv${VERSION}`;
}

/**
 * Print the banner to stderr for bare `elnora` or top-level `--help` only.
 * Skipped when piped/redirected, in CI, with --quiet, on --version, and for any
 * subcommand — so machine output and the MCP stdio transport stay clean.
 */
export function maybePrintBanner(argv: string[]): void {
	if (process.env.CI || process.env.GITHUB_ACTIONS) return;
	if (!process.stderr.isTTY) return;
	const args = argv.slice(2);
	if (args.includes("--quiet")) return;
	const isBare = args.length === 0;
	const isTopHelp = args.length === 1 && (args[0] === "--help" || args[0] === "-h");
	if (!isBare && !isTopHelp) return;
	process.stderr.write(`${renderBanner()}\n\n`);
}
