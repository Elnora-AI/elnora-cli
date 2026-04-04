#!/usr/bin/env node

/**
 * npm postinstall — show setup instructions after `npm install -g @elnora-ai/cli`.
 *
 * Intentionally non-interactive: npm postinstall runs in contexts where stdin
 * may not be available (CI, Docker, scripts). Interactive prompts belong in
 * the shell installer (install.sh) which always has a TTY.
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
  │   Get your API key from:                                     │
  │     https://platform.elnora.ai > Settings > API Keys         │
  │                                                              │
  │   Then run:                                                  │
  │     elnora auth login --api-key <paste-your-key-here>        │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
`;

console.error(msg);
