#!/usr/bin/env node

/**
 * npm postinstall — show setup instructions after `npm install -g @elnora-ai/cli`.
 *
 * Intentionally non-interactive: npm postinstall runs in contexts where stdin
 * may not be available (CI, Docker, scripts). Interactive prompts belong in
 * `elnora auth login` which the user runs manually after install.
 */

// Skip in CI or when output is suppressed
if (process.env.CI || process.env.GITHUB_ACTIONS || !process.stderr.isTTY) {
	process.exit(0);
}

const msg = `
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   Elnora CLI installed successfully!                         │
  │                                                              │
  │   To get started, run:                                       │
  │     elnora auth login                                        │
  │                                                              │
  │   Using Claude Code? Run:                                    │
  │     elnora setup-claude                                      │
  │                                                              │
  │   Documentation:                                             │
  │     https://github.com/Elnora-AI/elnora-cli                  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
`;

console.error(msg);
