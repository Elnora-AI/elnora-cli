/**
 * HTTP MCP server — Streamable HTTP transport for production deployment.
 *
 * Deployed to AWS ECS at mcp.elnora.ai/mcp. Ported from elnora-mcp-server
 * with API key auth (OAuth 2.1 deferred to separate effort).
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import rateLimit from "express-rate-limit";
import type { CommandRegistry } from "../core/registry.js";
import { createElnoraServer } from "./server.js";

export interface McpHttpConfig {
	port: number;
	host: string;
	tokenValidationUrl: string;
	mcpServiceKey: string;
}

export async function startHttpServer(registry: CommandRegistry, config: McpHttpConfig): Promise<void> {
	const app = express();
	app.set("trust proxy", 1);

	// Security headers (CoSAI MCP-T7)
	app.use((_req, res, next) => {
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("X-Frame-Options", "DENY");
		res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
		res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
		res.setHeader("Cache-Control", "no-store");
		next();
	});

	app.use(express.json({ limit: "1mb" }));

	// Health check
	app.get("/health", (_req, res) => {
		res.json({ status: "ok", service: "elnora-mcp" });
	});

	// Rate limiting on /mcp — 150 req/min per authenticated client
	app.use(
		"/mcp",
		rateLimit({
			windowMs: 60_000,
			limit: 150,
			standardHeaders: "draft-7",
			legacyHeaders: false,
			keyGenerator: (req) => {
				const apiKey = req.headers["x-api-key"];
				if (apiKey) return `key:${fnvHash(String(apiKey))}`;
				return `ip:${req.ip ?? "unknown"}`;
			},
			message: { error: "rate_limit_exceeded", error_description: "Too many requests. Please retry later." },
		}),
	);

	// MCP endpoint — API key auth + Streamable HTTP transport
	app.post("/mcp", async (req, res) => {
		const apiKey = req.headers["x-api-key"] as string | undefined;
		if (!apiKey) {
			res.status(401).json({ error: "missing_api_key", error_description: "X-API-Key header required" });
			return;
		}

		// Validate API key against platform
		const userId = await validateApiKeyWithPlatform(apiKey, config);
		if (!userId) {
			res.status(401).json({ error: "invalid_api_key", error_description: "API key rejected by platform" });
			return;
		}

		// Create per-request MCP server + transport
		let server: ReturnType<typeof createElnoraServer> | undefined;
		let transport: StreamableHTTPServerTransport | undefined;
		try {
			const getContext = () => ({
				apiKey,
				clientId: `apikey:${userId}`,
				scopes: ["*"],
			});
			server = createElnoraServer(registry, getContext);
			transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
				enableJsonResponse: true,
			});

			res.on("close", () => {
				transport?.close().catch(() => {});
				server?.close().catch(() => {});
			});

			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);
		} catch (error) {
			transport?.close().catch(() => {});
			server?.close().catch(() => {});
			console.error("MCP request error:", error);
			if (!res.headersSent) {
				res.status(500).json({ error: "internal_error", error_description: "MCP request failed" });
			}
		}
	});

	// GET and DELETE on /mcp return 405 per MCP Streamable HTTP spec
	app.get("/mcp", (_req, res) => {
		res.status(405).json({ error: "method_not_allowed", error_description: "Stateless server — use POST" });
	});
	app.delete("/mcp", (_req, res) => {
		res.status(405).json({ error: "method_not_allowed", error_description: "Sessions not supported" });
	});

	// Start server
	const httpServer = app.listen(config.port, config.host, () => {
		console.error(`Elnora MCP server running on http://${config.host}:${config.port}/mcp`);
		console.error(`Health check: http://localhost:${config.port}/health`);
		console.error("API Key auth: Send X-API-Key header");
	});

	// Graceful shutdown — let in-flight requests drain before ECS kills the process
	const shutdown = (signal: string) => {
		console.error(`${signal} received — shutting down gracefully`);
		httpServer.close(() => process.exit(0));
		// Force-exit after 25s if connections haven't drained
		setTimeout(() => process.exit(1), 25_000).unref();
	};
	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));

	// Handle server-level errors
	httpServer.on("error", (err: NodeJS.ErrnoException) => {
		if (err.code === "EADDRINUSE") {
			console.error(`Port ${config.port} is already in use`);
		} else {
			console.error("HTTP server error:", err);
		}
		process.exit(1);
	});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** FNV-1a hash for rate limiter bucket keys (non-crypto, consistent mapping). */
function fnvHash(value: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, "0");
}

/** Validate API key against the Elnora platform's token validation endpoint. */
async function validateApiKeyWithPlatform(apiKey: string, config: McpHttpConfig): Promise<string | null> {
	try {
		const response = await fetch(config.tokenValidationUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-Service-Key": config.mcpServiceKey },
			body: JSON.stringify({ token: apiKey }),
			signal: AbortSignal.timeout(10_000),
		});
		const data = (await response.json()) as { valid?: boolean; user_id?: string | number };
		if (data.valid && data.user_id) return String(data.user_id);
		return null;
	} catch {
		return null;
	}
}
