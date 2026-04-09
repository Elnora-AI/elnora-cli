/**
 * Interactive prompt utilities — zero dependencies, pkg-safe.
 */

import { createInterface } from "node:readline";

/**
 * Prompt for sensitive input with masked echo (shows asterisks).
 * Falls back to plain readline when stdin is not a TTY (piped input).
 */
export function promptSecret(message: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const { stdin, stdout } = process;

		if (!stdin.isTTY) {
			const rl = createInterface({ input: stdin, output: stdout });
			rl.question(message, (answer) => {
				rl.close();
				resolve(answer.trim());
			});
			return;
		}

		stdout.write(message);
		let input = "";
		const wasRaw = stdin.isRaw;
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		const onData = (char: string) => {
			switch (char) {
				case "\n":
				case "\r":
				case "\u0004": {
					stdin.setRawMode(wasRaw);
					stdin.pause();
					stdin.removeListener("data", onData);
					stdout.write("\n");
					resolve(input.trim());
					break;
				}
				case "\u0003": // Ctrl+C
				case "\u001B": {
					// Escape
					stdin.setRawMode(wasRaw);
					stdin.pause();
					stdin.removeListener("data", onData);
					stdout.write("\n");
					reject(new Error("Cancelled"));
					break;
				}
				case "\u007F":
				case "\b": {
					if (input.length > 0) {
						input = input.slice(0, -1);
						stdout.write("\b \b");
					}
					break;
				}
				default: {
					input += char;
					stdout.write("*");
					break;
				}
			}
		};

		stdin.on("data", onData);
	});
}
