# Phase 1: Testing

## Test Framework

`bun test` — built-in test runner with `describe`, `test`, `expect`.

## Test Database

- Uses Supabase-hosted PostgreSQL
- Each test file: setup → run migrations → tests → teardown
- Between tests: truncate tables or use transaction rollback

## God Check Helper

```typescript
// packages/tests/helpers/god-check.ts
async function verifyGodCheck(db: Database): Promise<void> {
  const result = await godCheck(db);
  if (!result.balanced) {
    const details = Object.entries(result.currencies)
      .filter(([_, v]) => !v.balanced)
      .map(([k, v]) => `${k}: debits=${v.totalDebits}, credits=${v.totalCredits}`)
      .join("; ");
    throw new Error(`GOD CHECK FAILED: ${details}`);
  }
}
```

Called in `afterEach` for every financial integration test.

## Phase 1 Test Specs (~80 tests)

### Shared Utilities (~15 tests)

**ID Generation:**
- generates prefixed ULID with correct prefix
- generates unique IDs (no collisions in 1000)
- IDs are sortable by creation time

**Money:**
- toMinorUnits converts correctly for each currency
- fromMinorUnits converts correctly for each currency
- addAmounts returns correct sum
- subtractAmounts throws on negative result
- calculateFee computes correct fee
- splitAmount: merchantShare + fee === amount (always)
- splitAmount with zero fee percent
- splitAmount with 100% fee
- convertCurrency: USD cents → USDC micro (multiply by 10^4)
- formatAmount displays correctly per currency

**Config:**
- validates required env vars
- throws on missing DATABASE_URL
- defaults work for optional vars

### Ledger (~25 tests)

**Post Transaction:**
- posts balanced 2-entry transaction
- posts balanced 4-entry transaction
- rejects transaction with 0 entries
- rejects transaction with 1 entry
- rejects unbalanced transaction (debits ≠ credits)
- rejects transaction with amount <= 0
- rejects transaction referencing non-existent account
- rejects transaction with mismatched currency
- transaction is atomic (all-or-nothing on DB error)
- god check passes after posting

**Get Balance:**
- returns 0 for account with no entries
- returns correct balance for asset account (debits - credits)
- returns correct balance for liability account (credits - debits)
- returns correct balance for revenue account
- returns correct balance after multiple transactions
- handles multi-currency correctly (only sums matching currency)

**Immutability:**
- UPDATE on ledger_transactions raises exception
- DELETE on ledger_transactions raises exception
- UPDATE on ledger_entries raises exception
- DELETE on ledger_entries raises exception

**God Check:**
- returns balanced=true for empty system
- returns balanced=true after balanced transactions
- per-currency check works independently
- god check endpoint returns correct JSON

**System Accounts:**
- all system accounts exist after seed
- system accounts have correct types and currencies

### Accounts (~15 tests)

**Account Holders:**
- creates account holder with valid input
- generates acc_ prefixed ID
- rejects invalid email
- lists account holders with pagination
- gets account holder by ID
- throws AccountNotFoundError for invalid ID

**Virtual Accounts:**
- creates fiat virtual account (USD)
- creates stablecoin virtual account (USDC on Polygon)
- creates corresponding ledger accounts
- rejects duplicate (same holder + currency + network)
- rejects stablecoin without network
- lists virtual accounts for holder
- gets balance (delegates to ledger)
- balance is 0 for new account

### Auth (~15 tests)

**API Keys:**
- creates API key with correct format
- key starts with sf_live_ prefix
- stores SHA-256 hash, not plaintext
- verifies valid key
- returns null for invalid key
- returns null for revoked key
- revokes key (sets revoked_at)
- revoked key cannot be un-revoked
- lists keys without exposing hash
- lists keys showing revoked status

**Middleware:**
- apiKeyAuth passes with valid key
- apiKeyAuth rejects missing Authorization header
- apiKeyAuth rejects invalid key
- apiKeyAuth rejects revoked key
- apiKeyAuth skips for excluded paths (/health)

### E2E / API (~10 tests)

**Health:**
- GET /health returns 200 with status ok

**Accounts API:**
- POST /api/v1/accounts creates account holder
- GET /api/v1/accounts lists accounts
- POST /api/v1/accounts/:id/virtual-accounts creates virtual account
- GET /api/v1/accounts/:id/virtual-accounts/:vid/balance returns balance

**Ledger API:**
- GET /api/v1/ledger/accounts returns all ledger accounts
- GET /api/v1/ledger/god-check returns balanced result

**API Keys API:**
- POST /api/v1/api-keys creates key and returns plaintext
- GET /api/v1/api-keys lists keys
- POST /api/v1/api-keys/:id/revoke revokes key

## Test Organization

```
packages/tests/
  helpers/
    god-check.ts      — God check verification helper
    setup.ts          — DB setup/teardown, migration runner
    fixtures.ts       — Test data factories
  phase-1/
    shared.test.ts    — ID, money, config tests
    ledger.test.ts    — Ledger posting, balance, immutability
    accounts.test.ts  — Account holders, virtual accounts
    auth.test.ts      — API keys, middleware
    api.test.ts       — E2E HTTP tests
```

## Running Tests

```bash
# Run all tests
bun test

# Run Phase 1 tests only
bun test packages/tests/phase-1/

# Run specific test file
bun test packages/tests/phase-1/ledger.test.ts

# Run with verbose output
bun test --verbose
```
