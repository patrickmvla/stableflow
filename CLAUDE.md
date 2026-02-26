# StableFlow — Fiat-to-Stablecoin Settlement Platform

## Quick Reference

- **Runtime:** Bun (not Node.js)
- **Language:** TypeScript (strict mode)
- **API:** Hono + Zod OpenAPI
- **Database:** PostgreSQL 16 via Drizzle ORM + postgres.js
- **Dashboard:** Next.js 16 + Tailwind + shadcn/ui
- **Testing:** bun test
- **Linting:** Biome

## Commands

- `bun install` — install dependencies
- `bun test` — run all tests
- `bun run dev` — start API server
- `bun run dev:web` — start dashboard
- `bun run db:migrate` — run migrations
- `bun run check` — lint + format check

## Architecture

Monorepo with Bun workspaces. Packages:

| Package | Scope | Depends On |
|---------|-------|------------|
| `shared` | IDs, money, errors, config, schemas | — |
| `ledger` | Double-entry bookkeeping | shared |
| `accounts` | Merchants, virtual accounts | shared, ledger |
| `auth` | API keys, audit logs | shared |
| `payments` | Payment intents, state machine | shared, ledger, accounts |
| `settlement` | Blockchain settlement pipeline | shared, ledger, accounts, payments |
| `products` | Product catalog, payment links | shared, payments |
| `events` | Transactional outbox, SSE | shared |
| `api` | Hono HTTP server | all packages |
| `web` | Next.js dashboard | — (calls API) |
| `tests` | Cross-package test suites | all packages |

## Conventions

### Code Style
- **Functional:** Export pure functions, not classes. Service objects are function collections.
- **No floating point for money.** All amounts are `bigint` in smallest currency unit.
- **Prefixed ULIDs** for all IDs: `acc_`, `vac_`, `txn_`, `ent_`, `pay_`, `stl_`, `prd_`, `lnk_`, `key_`, `aud_`, `evt_`
- **snake_case** in API responses, **camelCase** in TypeScript code.
- **Zod** for all validation. Schemas define the contract.
- **Drizzle ORM** for database queries. Raw SQL only for complex aggregations.

### Invariants (Non-Negotiable)
1. Every ledger transaction balances: `SUM(debits) === SUM(credits)` per transaction
2. Ledger entries are immutable: INSERT only, triggers block UPDATE/DELETE
3. State machine transitions enforced: no skipping, no backwards
4. All entry amounts > 0 (CHECK constraint)
5. `captured_amount <= authorized_amount`
6. `refunded_amount <= captured_amount`
7. Idempotency keys honored: same key + same params = same result
8. Concurrent ops serialized per payment: `SELECT ... FOR UPDATE`
9. Balances derived, never stored: computed from `SUM(ledger_entries)`
10. God check: `SUM(all debits) === SUM(all credits)` system-wide, per currency
11. Settlement amounts match payment captured amounts minus fees

### Testing (TDD — Strict)
1. **RED** — Write failing test from spec
2. **GREEN** — Minimum code to pass
3. **CHECK** — Run God Check after every financial mutation
4. **REFACTOR** — Clean code, tests still green
5. **CHECK** — God Check again

God check runs after every financial integration test. If it fails, stop everything.

### Commit Style
```
feat(ledger): implement postTransaction with balance validation
feat(payments): add payment intent state machine
fix(settlement): handle gas estimation edge case
test(ledger): add immutability constraint tests
```

### Error Handling
- `AppError` base class with `type`, `statusCode`, `details`
- Specific error classes per domain (e.g., `PaymentNotFoundError`, `LedgerImbalanceError`)
- API returns `{ error: { type, message, details? } }`

### API Design
- All routes under `/api/v1/`
- Mutations require `Idempotency-Key` header
- All responses include `X-Request-Id` header
- Cursor pagination: `?limit=20&cursor=<id>`
- Health check at `GET /health`
- OpenAPI spec at `GET /openapi.json`
- API docs at `GET /docs` (Scalar)

### Database
- PostgreSQL 16 (Supabase-hosted)
- Drizzle ORM for schema + queries
- Immutability enforced via SQL triggers on ledger tables

## Reference Patterns

This project builds on patterns from:
- `payment-engine/` — Ledger, payments, BigInt money, god check, state machines
- `permissions-engine/` — Monorepo structure, audit logs, API key crypto, error hierarchy
