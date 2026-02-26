# Phase 1: API Endpoints

## Package: `packages/api/`

Hono server with OpenAPI documentation.

## Server Setup

```typescript
// Hono with Zod OpenAPI
import { OpenAPIHono } from "@hono/zod-openapi";

const app = new OpenAPIHono();

// Middleware stack
app.use("*", requestTracing());
app.use("*", securityHeaders());
app.use("*", errorHandler());
app.use("/api/*", rateLimiter());
app.use("/api/*", apiKeyAuth());

// OpenAPI docs
app.doc("/openapi.json", { openapi: "3.1.0", info: { title: "StableFlow API", version: "1.0.0" } });
app.get("/docs", ScalarReference({ url: "/openapi.json" }));
```

## Phase 1 Routes

### Health Check

```
GET /health
```

Response `200`:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-02-24T12:00:00Z"
}
```

No auth required.

### Account Holders

```
POST /api/v1/accounts
```

Request:
```json
{
  "name": "Acme Corp",
  "email": "billing@acme.com",
  "metadata": { "industry": "ecommerce" }
}
```

Response `201`:
```json
{
  "object": "account_holder",
  "id": "acc_01JQXR5...",
  "name": "Acme Corp",
  "email": "billing@acme.com",
  "status": "active",
  "metadata": { "industry": "ecommerce" },
  "created_at": "2026-02-24T12:00:00Z",
  "updated_at": "2026-02-24T12:00:00Z"
}
```

```
GET /api/v1/accounts
```

Query params: `?limit=20&cursor=acc_01...`

Response `200`:
```json
{
  "object": "list",
  "data": [{ "object": "account_holder", ... }],
  "pagination": { "next_cursor": "acc_01...", "has_more": true }
}
```

```
GET /api/v1/accounts/:id
```

Response `200`: Single account holder object.

### Virtual Accounts

```
POST /api/v1/accounts/:id/virtual-accounts
```

Request:
```json
{
  "currency": "USD"
}
```

For stablecoins:
```json
{
  "currency": "USDC",
  "network": "polygon"
}
```

Response `201`:
```json
{
  "object": "virtual_account",
  "id": "vac_01JQXR5...",
  "account_holder_id": "acc_01JQXR5...",
  "currency": "USD",
  "type": "fiat",
  "network": null,
  "status": "active",
  "created_at": "2026-02-24T12:00:00Z"
}
```

```
GET /api/v1/accounts/:id/virtual-accounts
```

Response `200`: List of virtual accounts for the account holder.

```
GET /api/v1/accounts/:id/virtual-accounts/:vid/balance
```

Response `200`:
```json
{
  "object": "balance",
  "virtual_account_id": "vac_01JQXR5...",
  "currency": "USD",
  "amount": "10000",
  "formatted": "$100.00"
}
```

Note: `amount` is a string representation of bigint in minor units.

### Ledger

```
GET /api/v1/ledger/accounts
```

Response `200`:
```json
{
  "object": "list",
  "data": [
    {
      "object": "ledger_account",
      "id": "platform:fees:USD",
      "name": "Platform Fees (USD)",
      "type": "revenue",
      "currency": "USD",
      "balance": "3000",
      "formatted_balance": "$30.00"
    }
  ]
}
```

```
GET /api/v1/ledger/god-check
```

Response `200` (balanced):
```json
{
  "object": "god_check",
  "balanced": true,
  "currencies": {
    "USD": {
      "total_debits": "50000",
      "total_credits": "50000",
      "balanced": true
    }
  },
  "checked_at": "2026-02-24T12:00:00Z"
}
```

Response `200` (unbalanced — still 200 but `balanced: false`):
```json
{
  "object": "god_check",
  "balanced": false,
  "currencies": {
    "USD": {
      "total_debits": "50000",
      "total_credits": "49999",
      "balanced": false
    }
  },
  "checked_at": "2026-02-24T12:00:00Z"
}
```

### API Keys

```
POST /api/v1/api-keys
```

Request:
```json
{
  "name": "Production Key"
}
```

Response `201`:
```json
{
  "object": "api_key",
  "id": "key_01JQXR5...",
  "name": "Production Key",
  "prefix": "sf_live_",
  "plaintext": "sf_live_a1b2c3d4e5f6...",
  "created_at": "2026-02-24T12:00:00Z"
}
```

**Warning:** `plaintext` is only included in the creation response. Never shown again.

```
GET /api/v1/api-keys
```

Response `200`:
```json
{
  "object": "list",
  "data": [
    {
      "object": "api_key",
      "id": "key_01JQXR5...",
      "name": "Production Key",
      "prefix": "sf_live_",
      "created_at": "2026-02-24T12:00:00Z",
      "revoked_at": null
    }
  ]
}
```

```
POST /api/v1/api-keys/:id/revoke
```

Response `200`:
```json
{
  "object": "api_key",
  "id": "key_01JQXR5...",
  "revoked_at": "2026-02-24T12:01:00Z"
}
```

## Response Conventions

- All responses include `"object"` field for type identification
- Lists wrapped in `{ object: "list", data: [...], pagination: {...} }`
- Amounts serialized as strings (bigint-safe)
- Timestamps in ISO 8601
- snake_case field names in JSON
- `X-Request-Id` header on every response
- Errors: `{ error: { type, message, details? } }`
