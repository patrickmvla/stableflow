import { getDb, logger, UnauthorizedError } from "@stableflow/shared";
import type { Context, MiddlewareHandler, Next } from "hono";
import { verifyAPIKey } from "./service.ts";

const EXCLUDED_PATHS = ["/health", "/docs", "/openapi.json"];

function isExcluded(path: string): boolean {
	if (EXCLUDED_PATHS.includes(path)) return true;
	// Payment links by slug are public
	if (/^\/api\/v1\/payment-links\/[^/]+$/.test(path)) return true;
	return false;
}

export function apiKeyAuth(): MiddlewareHandler {
	return async (c: Context, next: Next) => {
		const path = new URL(c.req.url).pathname;
		if (isExcluded(path)) {
			return next();
		}

		const authHeader = c.req.header("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			throw new UnauthorizedError("Missing or invalid Authorization header");
		}

		const plaintextKey = authHeader.slice("Bearer ".length);
		const db = getDb();
		const record = await verifyAPIKey(db, plaintextKey);

		if (!record) {
			throw new UnauthorizedError("Invalid or revoked API key");
		}

		c.set("accountHolderId", record.accountHolderId);
		c.set("apiKeyId", record.id);
		return next();
	};
}

export function requestTracing(): MiddlewareHandler {
	return async (c: Context, next: Next) => {
		const requestId = crypto.randomUUID();
		c.set("requestId", requestId);

		const start = Date.now();
		logger.info("Request started", {
			requestId,
			method: c.req.method,
			path: new URL(c.req.url).pathname,
		});

		await next();

		const duration = Date.now() - start;
		c.res.headers.set("X-Request-Id", requestId);

		logger.info("Request completed", {
			requestId,
			status: c.res.status,
			duration,
		});
	};
}

export function securityHeaders(): MiddlewareHandler {
	return async (_c: Context, next: Next) => {
		await next();
		_c.res.headers.set("X-Content-Type-Options", "nosniff");
		_c.res.headers.set("X-Frame-Options", "DENY");
		_c.res.headers.set("X-XSS-Protection", "0");
		_c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
		_c.res.headers.set("Content-Security-Policy", "default-src 'none'");
	};
}

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

export function rateLimiter(options?: {
	maxRequests?: number;
	windowMs?: number;
}): MiddlewareHandler {
	const maxRequests = options?.maxRequests ?? 100;
	const windowMs = options?.windowMs ?? 60_000;

	return async (c: Context, next: Next) => {
		const apiKeyId = c.get("apiKeyId") as string | undefined;
		const key = apiKeyId ?? c.req.header("x-forwarded-for") ?? "anonymous";

		const now = Date.now();
		const record = rateLimitStore.get(key) ?? { count: 0, windowStart: now };

		if (now - record.windowStart > windowMs) {
			record.count = 0;
			record.windowStart = now;
		}

		record.count++;
		rateLimitStore.set(key, record);

		if (record.count > maxRequests) {
			return c.json({ error: { type: "RATE_LIMIT_EXCEEDED", message: "Too many requests" } }, 429);
		}

		return next();
	};
}

import { AppError } from "@stableflow/shared";
import { ZodError } from "zod";

export function errorHandler(): MiddlewareHandler {
	return async (c: Context, next: Next) => {
		try {
			await next();
		} catch (err) {
			if (err instanceof AppError) {
				return c.json(err.toJSON(), err.statusCode as 400 | 401 | 403 | 404 | 409 | 500);
			}

			if (err instanceof ZodError) {
				return c.json(
					{
						error: {
							type: "VALIDATION_ERROR",
							message: "Validation failed",
							details: err.flatten(),
						},
					},
					400,
				);
			}

			logger.error("Unhandled error", {
				error: err instanceof Error ? err.message : String(err),
			});

			return c.json({ error: { type: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
		}
	};
}
