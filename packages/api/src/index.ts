import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { ZodError } from "zod";
import { apiKeyAuth, rateLimiter, requestTracing, securityHeaders } from "@stableflow/auth";
import { AppError, getConfig, logger } from "@stableflow/shared";
import { healthRouter } from "./routes/health.ts";
import { accountsRouter } from "./routes/accounts.ts";
import { ledgerRouter } from "./routes/ledger.ts";
import { apiKeysRouter } from "./routes/api-keys.ts";

const app = new OpenAPIHono();

// Middleware
app.use("*", requestTracing());
app.use("*", securityHeaders());
app.use("/api/*", rateLimiter());
app.use("/api/*", apiKeyAuth());

// Idiomatic Hono error handler — catches errors from any middleware/route
app.onError((err, c) => {
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
});

// Routes
app.route("/", healthRouter);
app.route("/", accountsRouter);
app.route("/", ledgerRouter);
app.route("/", apiKeysRouter);

// OpenAPI docs
app.doc("/openapi.json", {
	openapi: "3.1.0",
	info: { title: "StableFlow API", version: "1.0.0" },
});

app.get(
	"/docs",
	apiReference({
		url: "/openapi.json",
	}),
);

// Start server
const config = getConfig();

export default {
	port: config.PORT,
	fetch: app.fetch,
};

export { app };
