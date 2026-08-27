/**
 * HTTP client for the Elnora Platform API.
 *
 * Port of: elnora-cli/src/elnora/lib/client.py (1,107 lines)
 *
 * Key patterns preserved:
 * - SSRF protection (hostname allowlist, HTTPS-only, userinfo detection)
 * - Redirect blocking (fetch with redirect: 'manual')
 * - Rate limiting (100ms minimum between requests)
 * - Retry with exponential backoff on 429
 * - Zero external HTTP dependencies (uses native fetch)
 */

import { BASE_URL, buildUrl, DEFAULT_HEADERS, ENDPOINTS, PRODUCTION_BASE_URL, VERSION } from "./config.js";
import {
	AuthError,
	ElnoraError,
	NetworkError,
	NotFoundError,
	RateLimitError,
	ServerError,
	scrub,
	ValidationError,
} from "./errors.js";
import { resolveApiKey } from "./profiles.js";

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

const ALLOWED_API_HOSTS = ["platform.elnora.ai"];
const ALLOWED_UPLOAD_SUFFIXES = [
	".amazonaws.com",
	".storage.googleapis.com",
	"storage.googleapis.com",
	".blob.core.windows.net",
];

export function validateApiUrl(url: string): void {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:") {
		throw new ElnoraError(`SSRF blocked: refusing non-HTTPS connection to ${parsed.hostname}`, {
			code: "SSRF_BLOCKED",
		});
	}
	if (!ALLOWED_API_HOSTS.includes(parsed.hostname)) {
		throw new ElnoraError(`SSRF blocked: refusing to connect to ${parsed.hostname}`, {
			code: "SSRF_BLOCKED",
		});
	}
	if (url.split("?")[0].includes("@")) {
		throw new ElnoraError("SSRF blocked: URL contains userinfo (@)", { code: "SSRF_BLOCKED" });
	}
}

export function validateUploadUrl(url: string): void {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:") {
		throw new ValidationError(
			`Upload URL must use HTTPS, got '${parsed.protocol.replace(":", "")}'.`,
			"Contact support — the API returned an insecure upload URL.",
		);
	}
	if (url.split("?")[0].includes("@")) {
		throw new ValidationError(
			"Upload URL contains userinfo (@).",
			"Contact support — the API returned a suspicious upload URL.",
		);
	}
	const hostname = parsed.hostname;
	if (!ALLOWED_UPLOAD_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
		throw new ValidationError(
			`Upload URL hostname '${hostname}' is not an allowed storage provider.`,
			"Contact support — the API returned an unexpected upload URL host.",
		);
	}
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const MIN_REQUEST_INTERVAL_MS = 100;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const JITTER_FACTOR = 0.25; // ±25% jitter to prevent thundering herd

export interface ClientOptions {
	baseUrl?: string;
	timeout?: number;
}

export class ElnoraApiClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly timeout: number;
	private lastRequestTime = 0;

	constructor(apiKey: string, options?: ClientOptions) {
		this.apiKey = apiKey;
		this.baseUrl = options?.baseUrl ?? BASE_URL;
		this.timeout = options?.timeout ?? REQUEST_TIMEOUT_MS;
	}

	static fromEnv(profileName?: string, options?: ClientOptions): ElnoraApiClient {
		const key = resolveApiKey(profileName);
		return new ElnoraApiClient(key, options);
	}

	async request<T = unknown>(
		endpoint: string,
		options?: {
			method?: string;
			body?: unknown;
			queryParams?: Record<string, string | number>;
			pathParams?: Record<string, string>;
		},
	): Promise<T> {
		const method = options?.method ?? "GET";

		// Build URL
		let url: string;
		if (endpoint.startsWith("/")) {
			url = `${this.baseUrl}${endpoint}`;
		} else if (endpoint in ENDPOINTS) {
			url = buildUrl(endpoint, options?.pathParams, this.baseUrl);
		} else {
			url = `${this.baseUrl}${endpoint}`;
		}

		if (options?.queryParams) {
			const qs = new URLSearchParams();
			for (const [k, v] of Object.entries(options.queryParams)) {
				qs.set(k, String(v));
			}
			url = `${url}?${qs.toString()}`;
		}

		// SSRF check (skip for custom base URLs like localhost dev). We compare
		// against the hardcoded production URL so that an ELNORA_API_URL override
		// still bypasses the allowlist intentionally.
		if (this.baseUrl === PRODUCTION_BASE_URL) {
			validateApiUrl(url);
		}

		// Rate limiting
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		if (elapsed < MIN_REQUEST_INTERVAL_MS) {
			await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
		}
		this.lastRequestTime = Date.now();

		// Build headers
		const headers: Record<string, string> = {
			...DEFAULT_HEADERS,
			"X-API-Key": this.apiKey,
			"User-Agent": `Elnora-CLI/${VERSION}`,
		};
		if (method === "GET" || method === "DELETE") {
			delete headers["Content-Type"];
		}

		// Request with retry on 429
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				const response = await fetch(url, {
					method,
					headers,
					body: options?.body ? JSON.stringify(options.body) : undefined,
					redirect: "manual",
					signal: AbortSignal.timeout(this.timeout),
				});

				// Redirect blocking — prevents API key forwarding to 3rd-party hosts
				if (response.status >= 300 && response.status < 400) {
					const location = response.headers.get("location") ?? "unknown";
					let hostname: string;
					try {
						hostname = new URL(location, url).hostname;
					} catch {
						hostname = "unknown";
					}
					throw new ElnoraError(`Unexpected redirect to ${hostname} (blocked for security)`, {
						code: "UNEXPECTED_REDIRECT",
					});
				}

				// Success
				if (response.ok) {
					const text = await response.text();
					if (!text) return undefined as T;
					try {
						return JSON.parse(text) as T;
					} catch {
						return text as T;
					}
				}

				// Error handling
				let bodyText = "";
				try {
					bodyText = scrub(await response.text());
				} catch {
					/* ignore */
				}

				// Extract human-readable message from backend JSON error response
				// Backend format: {"errorCode":"...","messages":["..."],"correlationId":"..."}
				let errorMessage = bodyText;
				try {
					const parsed = JSON.parse(bodyText) as { messages?: string[]; message?: string };
					if (parsed.messages?.length) {
						errorMessage = parsed.messages.join(" ");
					} else if (parsed.message) {
						errorMessage = parsed.message;
					}
				} catch {
					// Not JSON — use raw text
				}

				if (response.status === 401) {
					// The API answers an unrouted method with 401, not 405 — so a bad verb
					// looks exactly like a bad key. Say so when the verb is the likely cause.
					const suggestion =
						method !== "GET"
							? `Check your API key from platform.elnora.ai > Settings > API Keys. If that key works for other commands, the API may not route ${method} on this path — it answers an unsupported method with 401, not 405.`
							: undefined;
					throw new AuthError(errorMessage.slice(0, 200) || "Authentication failed", { suggestion });
				}
				if (response.status === 403) {
					throw new ElnoraError(errorMessage.slice(0, 200) || "Access denied", {
						code: "FORBIDDEN",
						suggestion:
							"You don't have permission to access this resource. Check the resource ID or your organization membership.",
					});
				}
				if (response.status === 404) {
					throw new NotFoundError("resource", errorMessage.slice(0, 200) || "not found");
				}
				if (response.status === 422) {
					throw new ValidationError(errorMessage.slice(0, 500) || "Validation error");
				}
				if (response.status === 429) {
					if (attempt < MAX_RETRIES) {
						const retryAfter = response.headers.get("retry-after");
						const baseDelay = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : RETRY_DELAYS_MS[attempt];
						const jitter = baseDelay * JITTER_FACTOR * (2 * Math.random() - 1); // ±25%
						await new Promise((r) => setTimeout(r, baseDelay + jitter));
						continue;
					}
					throw new RateLimitError();
				}
				if (response.status >= 500) {
					throw new ServerError(`Server error (HTTP ${response.status}): ${bodyText.slice(0, 500)}`);
				}
				throw new ElnoraError(`API error (HTTP ${response.status}): ${bodyText.slice(0, 500)}`, {
					code: `HTTP_${response.status}`,
				});
			} catch (err) {
				if (err instanceof ElnoraError) throw err;
				// The actual host we failed to reach — ground truth for the error message.
				let host: string | undefined;
				try {
					host = new URL(url).hostname;
				} catch {
					host = undefined;
				}
				if (err instanceof DOMException && err.name === "TimeoutError") {
					throw new NetworkError(host, `timed out after ${this.timeout}ms`);
				}
				// Node wraps the underlying socket failure in `err.cause` with a `.code`
				// such as ENOTFOUND (DNS), ECONNREFUSED (connection refused), ECONNRESET.
				const causeCode =
					err instanceof Error && err.cause && typeof err.cause === "object" && "code" in err.cause
						? String((err.cause as { code?: unknown }).code)
						: err instanceof Error
							? err.message
							: String(err);
				throw new NetworkError(host, scrub(causeCode));
			}
		}

		throw new RateLimitError("Rate limit exceeded after retries");
	}

	// Convenience methods
	async get<T = unknown>(
		endpoint: string,
		opts?: { queryParams?: Record<string, string | number>; pathParams?: Record<string, string> },
	): Promise<T> {
		return this.request<T>(endpoint, { method: "GET", ...opts });
	}

	async post<T = unknown>(
		endpoint: string,
		body?: unknown,
		opts?: { pathParams?: Record<string, string> },
	): Promise<T> {
		return this.request<T>(endpoint, { method: "POST", body, ...opts });
	}

	async put<T = unknown>(endpoint: string, body?: unknown, opts?: { pathParams?: Record<string, string> }): Promise<T> {
		return this.request<T>(endpoint, { method: "PUT", body, ...opts });
	}

	async patch<T = unknown>(
		endpoint: string,
		body?: unknown,
		opts?: { pathParams?: Record<string, string> },
	): Promise<T> {
		return this.request<T>(endpoint, { method: "PATCH", body, ...opts });
	}

	async del<T = unknown>(endpoint: string, opts?: { pathParams?: Record<string, string> }): Promise<T> {
		return this.request<T>(endpoint, { method: "DELETE", ...opts });
	}
}
