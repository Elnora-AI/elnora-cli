/**
 * Binary build script — bundles everything into a single CJS file for pkg.
 *
 * Unlike the npm build (ESM, external deps), this bundles ALL dependencies
 * into one file so pkg can wrap it with a Node.js runtime into a standalone binary.
 *
 * Usage:
 *   node scripts/build.mjs              # CJS bundle only
 *   node scripts/build.mjs --pkg        # CJS bundle + pkg binaries
 */

import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const doPkg = process.argv.includes("--pkg");

// Step 1: Bundle everything into a single CJS file
// No --packages=external — pkg needs all deps inlined
await build({
	entryPoints: ["src/cli.ts"],
	bundle: true,
	format: "cjs",
	platform: "node",
	target: "node20",
	outfile: "dist/cli.cjs",
	minify: true,
	sourcemap: false,
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
	// No shebang banner — pkg adds its own, and CJS with shebang
	// fails when run via `node dist/cli.cjs` directly
});

console.log(`Built dist/cli.cjs (${pkg.version})`);

// Step 2: Optionally run pkg to create standalone binaries
if (doPkg) {
	const targets = [
		"node20-linux-x64",
		"node20-linux-arm64",
		"node20-macos-x64",
		"node20-macos-arm64",
		"node20-win-x64",
	];

	console.log("Building standalone binaries...");
	for (const target of targets) {
		const platform = target.replace("node20-", "");
		const output = `dist/elnora-${platform}`;
		console.log(`  ${target} → ${output}`);
		execSync(`npx pkg dist/cli.cjs --target ${target} --output ${output}`, {
			stdio: "inherit",
		});
	}
	console.log("Done.");
}
