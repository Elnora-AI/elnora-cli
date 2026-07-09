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

import { z } from "zod";

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

/**
 * Network-layer failure (DNS resolution, connection refused, timeout, etc.).
 *
 * Unlike a bare `fetch failed`, this names the actual host the CLI tried to
 * reach and the underlying cause, and points the user at `elnora doctor` for
 * connectivity diagnostics — so the next agent or human sees ground truth in
 * the error itself. Mirrors the AuthError pattern above.
 */
export class NetworkError extends ElnoraError {
	readonly host: string | undefined;

	constructor(host?: string, cause?: string) {
		const target = host ? ` reaching ${host}` : "";
		const reason = cause ? ` (${cause})` : "";
		super(`Network error${target}${reason}`, {
			code: "NETWORK_ERROR",
			suggestion: host
				? `Run 'elnora doctor' to diagnose connectivity, then confirm ${host} is reachable from this machine.`
				: "Run 'elnora doctor' to diagnose connectivity.",
		});
		this.name = "NetworkError";
		this.host = host;
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
	result = result.replace(SCRUB_LONG_TOKEN_RE, (match) => {
		// Always redact prefixed API tokens.
		if (match.startsWith("elnora_live_")) return "[REDACTED]";
		// For the generic long-token branch, require at least one digit so that
		// long pure-letter strings (e.g. biological sequences) are not redacted.
		return /\d/.test(match) ? "[REDACTED]" : match;
	});
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

export function formatErrorPayload(err: Error): Record<string, string> {
	const payload: Record<string, string> = { error: scrub(err.message) };
	if (err instanceof ElnoraError) {
		payload.code = err.code;
		if (err.suggestion) payload.suggestion = err.suggestion;
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
	const message = scrub(err.message);
	lines.push(`Error: ${message}`);

	if (err instanceof ElnoraError && err.suggestion) {
		const steps = err.suggestion
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
		if (steps.length === 1) {
			lines.push("", `  ${steps[0]}`);
		} else {
			lines.push("", "Next steps:");
			for (const step of steps) {
				lines.push(`  ${step}`);
			}
		}
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Zod → ValidationError
// ---------------------------------------------------------------------------

/**
 * Convert a thrown error into a clean ValidationError when it is a Zod parse
 * failure, so a mistyped argument surfaces as e.g. "projectId: Invalid UUID"
 * (exit code 2) instead of a wall of serialized ZodError JSON. Non-Zod errors
 * are returned unchanged.
 */
export function toValidationError(err: unknown): Error {
	if (err instanceof z.ZodError) {
		const first = err.issues[0];
		const field = first?.path.length ? first.path.join(".") : "input";
		const message = first?.message ?? "Invalid input";
		const more = err.issues.length > 1 ? ` (+${err.issues.length - 1} more)` : "";
		return new ValidationError(
			`${field}: ${message}${more}`,
			"Run the command with --help to see the expected inputs.",
		);
	}
	return err instanceof Error ? err : new Error(String(err));
}
