/**
 * Error hierarchy and credential scrubbing for the Elnora CLI.
 *
 * Port of: elnora-cli/src/elnora/lib/errors.py (220 lines)
 *
 * Output contract:
 *   Success: JSON to stdout, exit 0
 *   Error:   JSON to stderr, exit 1-6
 *   Warning: JSON to stderr, exit 0
 */

// ---------------------------------------------------------------------------
// Error hierarchy
// ---------------------------------------------------------------------------

export interface ElnoraErrorOptions {
	suggestion?: string;
	code?: string;
}

export class ElnoraError extends Error {
	readonly code: string;
	readonly suggestion: string | undefined;

	constructor(message: string, options?: ElnoraErrorOptions) {
		super(message);
		this.name = "ElnoraError";
		this.code = options?.code ?? "ELNORA_ERROR";
		this.suggestion = options?.suggestion;
	}
}

export class AuthError extends ElnoraError {
	constructor(message?: string, options?: { suggestion?: string }) {
		super(message ?? "No Elnora API key found. Set ELNORA_API_KEY environment variable.", {
			code: "AUTH_FAILED",
			suggestion: options?.suggestion ?? "Get your API key from platform.elnora.ai > Settings > API Keys",
		});
		this.name = "AuthError";
	}
}

export class NotFoundError extends ElnoraError {
	constructor(entity: string, identifier: string) {
		super(`${entity} not found: ${identifier}`, {
			code: "NOT_FOUND",
			suggestion: "Check the identifier and try again.",
		});
		this.name = "NotFoundError";
	}
}

export class RateLimitError extends ElnoraError {
	constructor(message?: string) {
		super(message ?? "Elnora API rate limit exceeded.", {
			code: "RATE_LIMITED",
			suggestion: "Wait a moment and retry.",
		});
		this.name = "RateLimitError";
	}
}

export class ValidationError extends ElnoraError {
	constructor(message: string, suggestion?: string) {
		super(message, { code: "VALIDATION_ERROR", suggestion });
		this.name = "ValidationError";
	}
}

export class ServerError extends ElnoraError {
	constructor(message?: string) {
		super(message ?? "Elnora API server error.", {
			code: "SERVER_ERROR",
			suggestion: "Try again later. If the issue persists, contact support@elnora.ai.",
		});
		this.name = "ServerError";
	}
}

/** Distinct exit codes per error type — matches Python CLI exactly. */
export const EXIT_CODES = new Map<new (...args: never[]) => ElnoraError, number>([
	[ValidationError, 2],
	[AuthError, 3],
	[NotFoundError, 4],
	[RateLimitError, 5],
	[ServerError, 6],
]);

// ---------------------------------------------------------------------------
// Credential scrubbing
// ---------------------------------------------------------------------------

const SCRUB_KEY_VALUE_RE = /"?(?:ELNORA_API_KEY|ELNORA_MCP_API_KEY|api_key|x-api-key)"?\s*[=:]\s*"?([^\s"']+)"?/gi;
const SCRUB_LONG_TOKEN_RE = /elnora_live_[a-zA-Z0-9_-]{8,}|[a-zA-Z0-9_-]{40,}/g;

export function scrub(text: string): string {
	let result = text;
	const envKeys = ["ELNORA_API_KEY", "ELNORA_MCP_API_KEY"];
	for (const envVar of envKeys) {
		const key = process.env[envVar];
		if (key && result.includes(key)) {
			result = result.replaceAll(key, "[REDACTED]");
		}
	}
	result = result.replace(SCRUB_KEY_VALUE_RE, "[REDACTED]");
	result = result.replace(SCRUB_LONG_TOKEN_RE, "[REDACTED]");
	return result;
}

export function scrubData(obj: unknown): unknown {
	if (typeof obj === "string") return scrub(obj);
	if (Array.isArray(obj)) return obj.map(scrubData);
	if (obj !== null && typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj)) {
			result[k] = scrubData(v);
		}
		return result;
	}
	return obj;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

export function getExitCode(err: Error): number {
	for (const [ErrorClass, code] of EXIT_CODES) {
		if (err instanceof ErrorClass) return code;
	}
	return 1;
}

/** Map error codes to machine-readable retry hints for agents/MCP consumers. */
const RETRY_HINTS: Record<string, { retryable: boolean; action: string }> = {
	AUTH_FAILED: { retryable: false, action: "Check API key and re-authenticate." },
	VALIDATION_ERROR: { retryable: false, action: "Fix the input parameters and retry." },
	NOT_FOUND: { retryable: false, action: "Verify the resource ID exists." },
	RATE_LIMITED: { retryable: true, action: "Wait and retry after a delay." },
	SERVER_ERROR: { retryable: true, action: "Retry after a short delay." },
	TIMEOUT: { retryable: true, action: "Retry the request." },
	NETWORK_ERROR: { retryable: true, action: "Check connectivity and retry." },
	CONFIG_WRITE_ERROR: { retryable: false, action: "Check file system permissions." },
	RESPONSE_TIMEOUT: { retryable: true, action: "Agent may still be processing. Poll task messages to check." },
	SSRF_BLOCKED: { retryable: false, action: "Request blocked for security. Use HTTPS URLs on allowed hosts only." },
	UNEXPECTED_REDIRECT: { retryable: false, action: "API returned an unexpected redirect. Report this issue." },
};

export function formatErrorPayload(err: Error): Record<string, string | string[] | boolean> {
	const payload: Record<string, string | string[] | boolean> = { error: scrub(err.message) };
	if (err instanceof ElnoraError) {
		payload.code = err.code;
		if (err.suggestion) {
			// Multi-step suggestions render as an array so each step is readable in JSON
			if (err.suggestion.includes("\n")) {
				payload.steps = err.suggestion.split("\n").map((s) => s.trim()).filter(Boolean);
			} else {
				payload.suggestion = err.suggestion;
			}
		}
		// Machine-readable hints for agents and MCP consumers
		const hint = RETRY_HINTS[err.code];
		if (hint) {
			payload.retryable = hint.retryable;
			payload.action = hint.action;
		} else if (err.code.startsWith("HTTP_")) {
			// Dynamic HTTP status codes: 4xx = not retryable, 5xx = retryable
			const status = Number.parseInt(err.code.slice(5), 10);
			payload.retryable = status >= 500;
			payload.action = status >= 500
				? "Server error. Retry after a short delay."
				: `Client error (HTTP ${status}). Check request parameters.`;
		}
	} else if (err.constructor.name === "ZodError") {
		payload.code = "VALIDATION_ERROR";
		payload.retryable = false;
		payload.action = "Invalid input. Check required parameters and their types.";
	} else {
		payload.code = err.constructor.name;
	}
	return payload;
}

/**
 * Human-friendly error output for TTY terminals.
 * Renders the same data as formatErrorPayload but as readable text, not JSON.
 */
export function formatErrorForHuman(err: Error): string {
	const lines: string[] = [];
	const message = scrub(err instanceof Error ? err.message : String(err));
	lines.push(`Error: ${message}`);

	if (err instanceof ElnoraError && err.suggestion) {
		const steps = err.suggestion.split("\n").map((s) => s.trim()).filter(Boolean);
		if (steps.length === 1) {
			lines.push("", `  ${steps[0]}`);
		} else {
			lines.push("", "Next steps:");
			for (const step of steps) {
				lines.push(`  ${step}`);
			}
		}
	} else if (err.constructor.name === "ZodError") {
		lines.push("", "  Check the required parameters and try again.");
	}

	return lines.join("\n");
}
