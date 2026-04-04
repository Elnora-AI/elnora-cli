/** TTY detection for output mode decisions. */

export function isTTY(): boolean {
	return Boolean(process.stdout.isTTY);
}

export function isColorEnabled(): boolean {
	if (process.env.NO_COLOR !== undefined) return false;
	if (process.env.FORCE_COLOR !== undefined) return true;
	return isTTY();
}
