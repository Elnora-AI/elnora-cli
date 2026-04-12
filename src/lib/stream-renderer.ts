/**
 * Terminal renderer for SSE stream events.
 *
 * Design: status (thinking, tools) → stderr, content (tokens) → stdout.
 * This makes streaming pipeable: elnora tasks send ... --stream > response.txt
 */

import pc from "picocolors";
import type { StreamEvent } from "./stream.js";
import { isColorEnabled } from "./tty.js";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

export class StreamRenderer {
	private spinnerInterval: ReturnType<typeof setInterval> | null = null;
	private spinnerFrame = 0;
	private currentLabel = "";
	private useColor: boolean;

	constructor() {
		this.useColor = isColorEnabled();
	}

	renderEvent(event: StreamEvent): void {
		switch (event.type) {
			case "agent_status":
				this.startSpinner((event as { content: string }).content);
				break;

			case "token":
				this.stopSpinner();
				process.stdout.write((event as { content: string }).content);
				break;

			case "completed":
				this.stopSpinner();
				process.stdout.write("\n");
				break;

			case "error":
				this.stopSpinner();
				process.stderr.write(
					`\n${this.useColor ? pc.red("Error:") : "Error:"} ${(event as { content: string }).content}\n`,
				);
				break;

			case "timeout":
				this.stopSpinner();
				process.stderr.write(`\n${this.useColor ? pc.yellow("Stream timed out.") : "Stream timed out."}\n`);
				break;
		}
	}

	private startSpinner(label: string): void {
		this.stopSpinner();
		this.currentLabel = label;
		this.spinnerFrame = 0;

		// Only animate in TTY
		if (!process.stderr.isTTY) {
			process.stderr.write(`  ${label}\n`);
			return;
		}

		this.writeSpinnerFrame();
		this.spinnerInterval = setInterval(() => {
			this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
			this.writeSpinnerFrame();
		}, SPINNER_INTERVAL_MS);
	}

	private writeSpinnerFrame(): void {
		const frame = SPINNER_FRAMES[this.spinnerFrame];
		const text = this.useColor ? pc.dim(`${frame} ${this.currentLabel}`) : `${frame} ${this.currentLabel}`;
		process.stderr.write(`\r  ${text}`);
	}

	stopSpinner(): void {
		if (this.spinnerInterval) {
			clearInterval(this.spinnerInterval);
			this.spinnerInterval = null;
			// Clear spinner line
			if (process.stderr.isTTY) {
				process.stderr.write("\r\x1b[K");
			}
		}
	}
}
