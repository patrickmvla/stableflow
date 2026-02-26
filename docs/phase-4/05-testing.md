# Phase 4: Testing

## Phase 4 Test Specs (~60 tests)

### Product CRUD (~15 tests)

- creates product with valid input
- generates prd_ prefixed ID
- rejects price <= 0
- rejects unsupported currency
- sets default inventory to unlimited (-1)
- creates with custom inventory count
- updates product name
- updates product price
- updates product inventory
- archives product (status → archived)
- lists products for account holder
- lists with pagination
- gets product by ID
- 404 for non-existent product
- cannot update archived product price (stretch — or allow)

### Inventory Management (~10 tests)

- decrements inventory from 10 to 9
- decrements inventory from 1 to 0
- rejects decrement when inventory is 0 (out of stock)
- unlimited inventory (-1) not decremented
- concurrent decrements: no overselling (FOR UPDATE)
- concurrent decrements: correct final count
- inventory check is atomic with decrement
- inventory matches after 100 concurrent decrements on stock of 100
- god check unaffected by inventory operations
- archived product cannot have inventory decremented

### Payment Links (~15 tests)

- creates payment link with product
- creates standalone payment link with custom amount
- generates unique slug from product name
- slug is URL-safe (lowercase, hyphens, no special chars)
- slug collision handled (retry with new suffix)
- single-use link: used after first payment
- single-use link: rejected on second attempt
- multi-use link: works multiple times
- expired link: rejected after expires_at
- link inherits amount/currency from product
- standalone link requires amount + currency
- lists payment links for merchant
- gets link by slug (public, no auth)
- 404 for non-existent slug
- 410 for used single-use link

### Property-Based Tests (~10 tests)

Property-based testing with random inputs to verify invariants hold universally.

```typescript
// Using fast-check or custom generator
import { fc } from "fast-check";

// Property: For any valid payment amount and fee percent,
// merchantShare + fee === amount
test("fee split is always exact", () => {
  fc.assert(
    fc.property(
      fc.bigInt(1n, 1000000000n),  // amount: 1 cent to $10M
      fc.integer(0, 100),           // feePercent: 0-100%
      (amount, feePercent) => {
        const { merchantShare, fee } = splitAmount(amount, feePercent);
        return merchantShare + fee === amount;
      }
    )
  );
});
```

**Properties to verify:**
- Fee split exact: merchantShare + fee === amount (any amount, any fee%)
- God check: after N random payments and refunds, system balanced
- State machine: random valid transition sequence always succeeds
- State machine: random invalid transition always throws
- Inventory: N concurrent decrements on stock of N → final count is 0
- Idempotency: duplicate request always returns same response
- Slug uniqueness: 1000 generated slugs are all unique
- Amount conversion: toMinorUnits(fromMinorUnits(x)) === x
- Pagination: paginating through all items returns complete set
- Serialization: bigint → string → bigint round-trips correctly

### Reconciliation (~5 tests)

Independent verification that the system is internally consistent.

```typescript
// Witness reconstruction: can we rebuild settlement state from events alone?
test("witness reconstruction matches actual state", async () => {
  // 1. Run a full payment → settlement flow
  // 2. Read all domain_events for the settlement
  // 3. Replay events to reconstruct settlement state
  // 4. Compare reconstructed state with actual DB state
  // 5. They must match exactly
});
```

**Reconciliation tests:**
- Witness reconstruction: settlement state matches event replay
- Balance reconciliation: SUM(ledger entries) matches reported balances
- Payment-settlement linkage: every succeeded payment has a settlement
- Fee reconciliation: SUM(platform fees) matches SUM(payment fee_amounts)
- Inventory reconciliation: initial stock - SUM(purchases) = current stock

### Demo Mode (~5 tests)

- demo start creates sample data
- demo creates payments at configured interval
- demo speed multiplier affects settlement speed
- demo stop halts new payment creation
- demo data accessible after stop (not cleaned up)

## Test Organization

```
packages/tests/phase-4/
  products.test.ts         — Product CRUD
  inventory.test.ts        — Inventory locking and concurrency
  payment-links.test.ts    — Link creation, slugs, single-use
  property-based.test.ts   — Random input invariant verification
  reconciliation.test.ts   — Cross-system consistency checks
  demo.test.ts             — Demo mode operations
```

## Full Suite Summary

| Phase | Tests | Focus |
|-------|-------|-------|
| Phase 1 | ~80 | Foundation: ledger, accounts, auth |
| Phase 2 | ~150 | Payments: lifecycle, fees, concurrency |
| Phase 3 | ~120 | Settlement: pipeline, networks, SSE |
| Phase 4 | ~60 | Products: catalog, links, properties |
| **Total** | **~410** | **Full system verification** |

## Running Full Suite

```bash
# All tests
bun test

# By phase
bun test packages/tests/phase-1/
bun test packages/tests/phase-2/
bun test packages/tests/phase-3/
bun test packages/tests/phase-4/

# Property-based (may take longer)
bun test packages/tests/phase-4/property-based.test.ts

# Reconciliation
bun test packages/tests/phase-4/reconciliation.test.ts
```
