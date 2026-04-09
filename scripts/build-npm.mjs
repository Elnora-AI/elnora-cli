/**
 * npm build script — ESM bundle with external deps for npm installs.
 *
 * Injects the version from package.json at build time so it works
 * regardless of filesystem layout (npm global install, npx, etc).
 */

import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

await build({
	entryPoints: ["src/cli.ts"],
	bundle: true,
	format: "esm",
	platform: "node",
	target: "node20",
	outfile: "dist/cli.js",
	packages: "external",
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
});

console.log(`Built dist/cli.js (${pkg.version})`);
