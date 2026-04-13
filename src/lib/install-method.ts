/**
 * Detect how the CLI was installed — determines update instructions.
 */

export type InstallMethod = "npm" | "homebrew" | "binary";

export function detectInstallMethod(): InstallMethod {
	const execPath = process.argv[1] ?? "";

	if (execPath.includes("node_modules")) {
		return "npm";
	}

	if (execPath.includes("/Cellar/") || execPath.includes("/homebrew/")) {
		return "homebrew";
	}

	return "binary";
}

export function getUpdateInstruction(method: InstallMethod): string {
	switch (method) {
		case "npm":
			return "npm install -g @elnora-ai/cli@latest";
		case "homebrew":
			return "brew upgrade elnora";
		case "binary":
			return "elnora update --install";
	}
}
