import { createInterface } from "node:readline/promises";

/**
 * Prompt user for confirmation before destructive operations.
 * Returns false in non-interactive (piped) environments.
 *
 * @param prompt - Message to display
 * @param requiredInput - If set, user must type this exact string to confirm (e.g., "DELETE")
 */
export async function confirmDestructive(prompt: string, requiredInput?: string): Promise<boolean> {
	if (!process.stdin.isTTY) return false;
	const rl = createInterface({ input: process.stdin, output: process.stderr });
	try {
		const answer = await rl.question(prompt);
		if (requiredInput) return answer.trim() === requiredInput;
		return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
	} finally {
		rl.close();
	}
}
