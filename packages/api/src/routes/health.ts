import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

export const healthRouter = new OpenAPIHono();

const HealthResponseSchema = z.object({
	status: z.literal("ok"),
	version: z.string(),
	timestamp: z.string(),
});

const route = createRoute({
	method: "get",
	path: "/health",
	tags: ["Health"],
	responses: {
		200: {
			content: { "application/json": { schema: HealthResponseSchema } },
			description: "Service is healthy",
		},
	},
});

healthRouter.openapi(route, (c) => {
	return c.json({
		status: "ok" as const,
		version: "1.0.0",
		timestamp: new Date().toISOString(),
	});
});
