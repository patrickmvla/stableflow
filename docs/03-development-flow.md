# Development Flow

## TDD Methodology

### The Cycle (Non-Negotiable)

```
1. RED    — Write a failing test from the spec
2. GREEN  — Write the minimum code to pass
3. CHECK  — Run God Check (verify system balance)
4. REFACTOR — Clean up code (tests still green)
5. CHECK  — God Check again
```

God check runs after every financial integration test. If it fails, everything stops.

### Test Hierarchy

```
Unit Tests           — Pure logic, no DB (money math, state machine, ID generation)
Integration Tests    — Single package with real DB (ledger posting, account creation)
Cross-Package Tests  — Multiple packages with real DB (payment → ledger flow)
E2E Tests            — HTTP requests against running API
Property-Based Tests — Random inputs to verify invariants (Phase 4)
```

### Test Database

- Tests use the same Supabase database (or a separate test schema)
- Each test file gets a fresh transaction that rolls back (or truncates tables)

## Phase Gates

Each phase must pass its gate before moving to the next:

### Phase 1 Gate: Foundation
- [ ] God check passes (per-currency)
- [ ] Dashboard shows accounts and balances
- [ ] API docs render at `/docs`
- [ ] `GET /health` returns OK
- [ ] ~80 tests green

### Phase 2 Gate: Payments
- [ ] Full payment lifecycle: created → confirmed → processing → succeeded
- [ ] Fee split correct: merchant_amount + fee_amount = total_amount
- [ ] Refund (full + partial) works
- [ ] Dashboard shows payments flowing
- [ ] God check still green
- [ ] ~150 new tests green (230 total)

### Phase 3 Gate: Settlement
- [ ] Full flow: payment → settlement → stablecoin balance
- [ ] Real-time dashboard updates via SSE
- [ ] Network selection reasoning displayed
- [ ] Per-currency god check green
- [ ] ~120 new tests green (350 total)

### Phase 4 Gate: Products + Demo
- [ ] Product CRUD + inventory management
- [ ] Payment links with slugs
- [ ] Demo mode runs automatically
- [ ] All ~410 tests green
- [ ] Ready for interview

## Commit Style

```
feat(scope): description     — New functionality
fix(scope): description      — Bug fix
test(scope): description     — Test additions
refactor(scope): description — Code restructuring
docs(scope): description     — Documentation
chore(scope): description    — Build, config, tooling
```

**Scopes:** shared, ledger, accounts, auth, payments, settlement, events, products, api, web, tests

**Examples:**
```
feat(ledger): implement postTransaction with balance validation
test(ledger): add immutability constraint tests
feat(payments): add payment intent state machine
fix(settlement): handle gas estimation edge case for small amounts
feat(web): add settlement real-time tracker with SSE
chore: configure Supabase database connection
```

## Build Order

### Phase 1: Foundation
1. `packages/shared/` — ID gen, money, errors, config, schemas
2. `packages/ledger/` — Ledger accounts, transactions, entries, god check
3. `packages/accounts/` — Account holders, virtual accounts
4. `packages/auth/` — API keys, audit logs
5. `packages/api/` — Hono server, Phase 1 routes
6. `packages/web/` — Dashboard with accounts + ledger pages
7. `packages/tests/` — Phase 1 test suite

### Phase 2: Payments
1. `packages/payments/` — Payment intents, state machine, fees
2. `packages/api/` — Add payment routes
3. `packages/web/` — Add payments page
4. `packages/tests/` — Phase 2 test suite

### Phase 3: Settlement
1. `packages/settlement/` — Pipeline, network selection, simulator
2. `packages/events/` — Transactional outbox, SSE
3. `packages/api/` — Add settlement + SSE routes
4. `packages/web/` — Add settlement page, real-time updates
5. `packages/tests/` — Phase 3 test suite

### Phase 4: Products
1. `packages/products/` — Catalog, payment links
2. `packages/api/` — Add product + link routes
3. `packages/web/` — Add products page, demo mode
4. `packages/tests/` — Phase 4 test suite + property-based tests

## File Structure Per Package

```
packages/<name>/
  package.json
  tsconfig.json
  src/
    index.ts          — Public exports
    service.ts        — Core business logic (exported functions)
    types.ts          — TypeScript types and interfaces
    schema.ts         — Drizzle table definitions
    routes.ts         — Hono route definitions (if applicable)
    errors.ts         — Domain-specific errors (if needed)
```

## Environment Variables

```env
DATABASE_URL=postgresql://...  # Supabase connection string
PORT=3456
NODE_ENV=development
LOG_LEVEL=debug
API_KEY_SALT=stableflow-dev-salt
```
