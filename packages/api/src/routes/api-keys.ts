import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { ApiKeyIdSchema, getDb } from "@stableflow/shared";
import { createAPIKey, listAPIKeys, revokeAPIKey } from "@stableflow/auth";

export const apiKeysRouter = new OpenAPIHono();

const APIKeySchema = z.object({
	object: z.literal("api_key"),
	id: z.string(),
	name: z.string(),
	prefix: z.string(),
	created_at: z.string(),
	revoked_at: z.string().nullable(),
});

const APIKeyCreateSchema = z.object({
	object: z.literal("api_key"),
	id: z.string(),
	name: z.string(),
	prefix: z.string(),
	plaintext: z.string(),
	created_at: z.string(),
});

// POST /api/v1/api-keys
const createKeyRoute = createRoute({
	method: "post",
	path: "/api/v1/api-keys",
	tags: ["API Keys"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: z.object({ name: z.string().min(1) }),
				},
			},
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: APIKeyCreateSchema } },
			description: "API key created",
		},
	},
});

apiKeysRouter.openapi(createKeyRoute, async (c) => {
	const body = c.req.valid("json");
	const db = getDb();
	const accountHolderId = c.get("accountHolderId") as string;
	const result = await createAPIKey(db, { accountHolderId, name: body.name });
	return c.json(
		{
			object: "api_key" as const,
			id: result.id,
			name: result.name,
			prefix: result.prefix,
			plaintext: result.plaintext,
			created_at: result.createdAt.toISOString(),
		},
		201,
	);
});

// GET /api/v1/api-keys
const listKeysRoute = createRoute({
	method: "get",
	path: "/api/v1/api-keys",
	tags: ["API Keys"],
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						object: z.literal("list"),
						data: z.array(APIKeySchema),
					}),
				},
			},
			description: "List of API keys",
		},
	},
});

apiKeysRouter.openapi(listKeysRoute, async (c) => {
	const db = getDb();
	const accountHolderId = c.get("accountHolderId") as string;
	const keys = await listAPIKeys(db, accountHolderId);
	return c.json({
		object: "list" as const,
		data: keys.map((k) => ({
			object: "api_key" as const,
			id: k.id,
			name: k.name,
			prefix: k.prefix,
			created_at: k.createdAt.toISOString(),
			revoked_at: k.revokedAt?.toISOString() ?? null,
		})),
	});
});

// POST /api/v1/api-keys/:id/revoke
const revokeKeyRoute = createRoute({
	method: "post",
	path: "/api/v1/api-keys/{id}/revoke",
	tags: ["API Keys"],
	request: {
		params: z.object({ id: ApiKeyIdSchema }),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						object: z.literal("api_key"),
						id: z.string(),
						revoked_at: z.string(),
					}),
				},
			},
			description: "API key revoked",
		},
	},
});

apiKeysRouter.openapi(revokeKeyRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = getDb();
	const accountHolderId = c.get("accountHolderId") as string;
	await revokeAPIKey(db, id, accountHolderId);
	return c.json({
		object: "api_key" as const,
		id,
		revoked_at: new Date().toISOString(),
	});
});
