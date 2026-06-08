/** Read piped input from stdin. */

/**
 * Read all of stdin to a string. Resolves "" immediately when stdin is a TTY
 * (interactive — nothing piped) so callers never hang waiting on a terminal.
 *
 * Callers that REQUIRE piped data should guard on `process.stdin.isTTY` first
 * and surface a clear error (see `elnora auth login --api-key-stdin`).
 */
export function readStdin(): Promise<string> {
	return new Promise((resolve, reject) => {
		const { stdin } = process;
		if (stdin.isTTY) {
			resolve("");
			return;
		}
		let data = "";
		stdin.setEncoding("utf8");
		stdin.on("data", (chunk) => {
			data += chunk;
		});
		stdin.on("end", () => resolve(data));
		stdin.on("error", (err) => reject(err));
		stdin.resume();
	});
}
