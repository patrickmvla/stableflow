# Phase 3: Testing

## Phase 3 Test Specs (~120 tests)

### Settlement State Machine (~15 tests)

- validates pending → submitting
- validates submitting → submitted
- validates submitting → failed
- validates submitted → confirming
- validates submitted → failed
- validates confirming → confirmed
- validates confirming → failed
- validates confirmed → settled
- validates failed → retrying
- validates failed → abandoned
- validates retrying → submitting
- rejects settled → any
- rejects abandoned → any
- rejects pending → settled (skip)
- terminal states: settled, abandoned

### Settlement Pipeline Happy Path (~15 tests)

- creates settlement from succeeded payment
- selects optimal network
- estimates gas for selected network
- submits to blockchain simulator
- receives tx hash on submission
- transitions through submitting → submitted → confirming
- tracks confirmation progress incrementally
- reaches required confirmations
- transitions to confirmed → settled
- posts cross-currency ledger entries on settlement
- merchant stablecoin balance increases
- merchant fiat balance decreases
- gas fee recorded in platform:gas account
- full pipeline: payment → settlement → stablecoin balance
- god check passes after settlement (per-currency)

### Network Selection (~20 tests)

- selects cheapest network when cost weighted highest
- selects fastest network when speed weighted highest
- selects most reliable when reliability weighted highest
- default weights: cost 40%, speed 30%, reliability 30%
- polygon wins for typical small settlement ($100)
- ethereum competitive for large settlements
- arbitrum wins for speed-critical settlements
- solana competitive on cost
- base competitive overall
- scoring is deterministic (same inputs → same output)
- all networks scored even if one is selected
- inactive networks excluded from selection
- generates human-readable reasoning
- reasoning mentions winner and runner-up
- reasoning includes cost/speed/reliability comparison
- handles single available network
- handles all networks unavailable (error)
- scores normalized 0-1
- composite score is weighted sum
- ranking is correct (highest score first)

### Gas Estimation (~10 tests)

- deterministic mode: returns fixed fee
- realistic mode: adds volatility
- ethereum gas higher than L2s
- polygon gas very low
- solana gas lowest
- gas estimate in correct denomination
- volatility factor applied correctly
- gas estimate > 0 always
- fee USD conversion correct
- gas tracking: estimate vs actual recorded

### Blockchain Simulator (~15 tests)

- deterministic mode: predictable confirmations
- realistic mode: variable timing
- speed multiplier 1x: real-time
- speed multiplier 5x: 5x faster
- speed multiplier 20x: 20x faster (demo)
- submit returns tx hash
- get status returns confirmation count
- confirmations increment over time
- transaction fails with configured probability
- failed transaction returns error
- multiple concurrent settlements
- each settlement independent
- simulator reset between tests
- block time matches network config
- finality time approximately correct

### Cross-Currency Ledger (~10 tests)

- USD → USDC: correct decimal conversion (cents → micro)
- source debit in fiat currency
- target credit in stablecoin currency
- gas fee in stablecoin currency
- per-currency god check: USD balanced
- per-currency god check: USDC balanced
- merchant fiat balance decreases by source amount
- merchant stablecoin balance increases by target amount
- platform gas account debited
- settlement ledger entries have correct reference

### Retry Logic (~10 tests)

- failed settlement can be retried
- retry increments retry count
- retry transitions: failed → retrying → submitting
- new gas estimate on retry
- retry with different network (if first fails)
- max retries reached → abandoned
- abandoned cannot be retried
- exponential backoff timing correct
- error message preserved through retry
- god check stable through retries

### Settlement Events (~10 tests)

- every state transition creates event
- event includes from/to status
- confirmation progress events created
- network selection event with reasoning
- gas estimation event
- events immutable (cannot update/delete)
- event timeline ordered by created_at
- all events for a settlement retrievable
- witness reconstruction: rebuild status from events alone
- event count matches expected for happy path

### SSE Delivery (~10 tests)

- SSE endpoint returns text/event-stream
- client receives settlement.status_changed events
- client receives settlement.confirmation_progress events
- heartbeat sent every 30s
- multiple clients receive same events
- client disconnect cleans up
- events published in order
- outbox: events stored in DB before broadcast
- outbox: unpublished events retried
- event ID included in SSE message

### API Integration (~10 tests)

- GET /api/v1/settlements/:id returns settlement
- GET /api/v1/settlements lists with pagination
- GET /api/v1/settlements?status=settled filters
- GET /api/v1/settlements?network=polygon filters
- GET /api/v1/settlements/:id/events returns timeline
- POST /api/v1/settlements/:id/retry retries failed
- GET /api/v1/networks lists all networks
- GET /api/v1/networks includes gas estimates
- 404 for non-existent settlement
- 409 for retry on non-failed settlement

## Test Organization

```
packages/tests/phase-3/
  state-machine.test.ts        — Settlement transitions
  pipeline.test.ts             — Happy path end-to-end
  network-selection.test.ts    — Scoring algorithm
  gas-estimation.test.ts       — Gas simulation
  blockchain-simulator.test.ts — Simulated blockchain
  cross-currency.test.ts       — Ledger entries across currencies
  retry.test.ts                — Failure and retry logic
  events.test.ts               — Event recording and completeness
  sse.test.ts                  — SSE broadcasting
  api.test.ts                  — HTTP endpoints
```

## Test Utilities

### Blockchain Simulator (Deterministic Mode)

```typescript
// packages/tests/helpers/simulator.ts
function createTestSimulator(): BlockchainSimulator {
  return createBlockchainSimulator({
    mode: "deterministic",
    speedMultiplier: 1000, // Instant for tests
  });
}
```

### Settlement Test Factory

```typescript
// packages/tests/helpers/fixtures.ts
async function createTestSettlement(db: Database, overrides?: Partial<Settlement>): Promise<Settlement>;
async function settlePayment(db: Database, paymentId: string): Promise<Settlement>;
```
