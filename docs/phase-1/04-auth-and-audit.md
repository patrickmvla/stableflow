# Phase 1: Auth & Audit

## Package: `packages/auth/`

API key authentication and immutable audit logging.

## API Keys

### Generation

```typescript
interface CreateAPIKeyInput {
  accountHolderId: string;
  name: string;
}

interface APIKeyCreateResult {
  id: string;           // "key_01JQXR..."
  name: string;
  accountHolderId: string;
  prefix: string;       // First 8 chars of key: "sf_live_"
  plaintext: string;    // Full key, shown ONCE: "sf_live_01JQXR5K..."
  createdAt: Date;
}
```

**Key format:** `sf_live_{random_32_bytes_hex}`

**Steps:**
1. Generate 32 random bytes → hex string
2. Prepend prefix: `sf_live_`
3. Compute SHA-256 hash of full key
4. Store: id, name, accountHolderId, prefix, keyHash, createdAt
5. Return plaintext to user ONCE

### Verification

```typescript
async function verifyAPIKey(db: Database, plaintextKey: string): Promise<APIKeyRecord | null>;
```

**Steps:**
1. Extract prefix from key
2. Compute SHA-256 hash
3. Look up by hash
4. Check not revoked (`revoked_at IS NULL`)
5. Return key record with accountHolderId, or null

### Revocation

```typescript
async function revokeAPIKey(db: Database, keyId: string, accountHolderId: string): Promise<void>;
```

Sets `revoked_at = NOW()`. Irreversible (INV-A3).

### Listing

```typescript
async function listAPIKeys(db: Database, accountHolderId: string): Promise<APIKeyRecord[]>;
```

Returns all keys (never the hash or plaintext). Shows: id, name, prefix, createdAt, revokedAt.

## Hono Middleware

### API Key Auth Middleware

```typescript
function apiKeyAuth(): MiddlewareHandler;
```

**Flow:**
1. Extract `Authorization: Bearer <key>` header
2. If missing → 401 Unauthorized
3. Call `verifyAPIKey(db, key)`
4. If null or revoked → 401 Unauthorized
5. Set `c.set("accountHolderId", record.accountHolderId)`
6. Set `c.set("apiKeyId", record.id)`
7. Call `next()`

**Excluded paths:** `GET /health`, `GET /docs`, `GET /openapi.json`, `GET /api/v1/payment-links/:slug`

### Request Tracing Middleware

```typescript
function requestTracing(): MiddlewareHandler;
```

1. Generate request ID (UUID v4)
2. Set `X-Request-Id` response header
3. Set `c.set("requestId", id)`
4. Log request start + end with duration

### Security Headers Middleware

```typescript
function securityHeaders(): MiddlewareHandler;
```

Sets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'none'`

### Rate Limiting Middleware

```typescript
function rateLimiter(options?: { maxRequests?: number; windowMs?: number }): MiddlewareHandler;
```

In-memory sliding window rate limiter per API key. Default: 100 requests per 60 seconds.

### Error Handler Middleware

```typescript
function errorHandler(): MiddlewareHandler;
```

Catches errors and returns structured JSON:
- `AppError` → use its statusCode and toJSON()
- `ZodError` → 400 with validation details
- Unknown → 500 Internal Server Error (no details leaked)

## Audit Logs

### Schema

```typescript
interface AuditLog {
  id: string;           // "aud_01JQXR..."
  actorType: "api_key" | "system";
  actorId: string;
  action: string;       // "account.created", "payment.confirmed", etc.
  resourceType: string; // "account_holder", "payment_intent", etc.
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt: Date;
}
```

### Writing

```typescript
async function writeAuditLog(db: Database, entry: AuditLogInput): Promise<string>;
```

Called by middleware or service functions after state changes. Immutable — INSERT only.

### Audit Event Types

```
account.created, account.updated
virtual_account.created
api_key.created, api_key.revoked
payment.created, payment.confirmed, payment.succeeded, payment.canceled, payment.refunded
settlement.created, settlement.submitted, settlement.confirmed, settlement.settled, settlement.failed
product.created, product.updated, product.deleted
payment_link.created
```

## Middleware Stack Order

Applied to the Hono app in this order:

```typescript
app.use("*", requestTracing());
app.use("*", securityHeaders());
app.use("*", errorHandler());
app.use("/api/*", rateLimiter());
app.use("/api/*", apiKeyAuth());
```
