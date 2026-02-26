# Phase 2: Testing

## Phase 2 Test Specs (~150 tests)

### State Machine (~20 tests)

- validates created → confirmed
- validates created → canceled
- validates created → expired
- validates confirmed → processing
- validates confirmed → canceled
- validates processing → succeeded
- validates succeeded → refunded
- validates succeeded → partially_refunded
- validates partially_refunded → refunded
- validates partially_refunded → partially_refunded
- rejects canceled → confirmed
- rejects expired → confirmed
- rejects refunded → any
- rejects succeeded → canceled
- rejects created → succeeded (skip)
- rejects created → processing (skip)
- rejects processing → canceled
- rejects confirmed → succeeded (skip)
- returns allowed transitions for current state
- terminal states have no valid transitions

### Payment Creation (~15 tests)

- creates payment intent with valid input
- generates pay_ prefixed ID
- calculates fee correctly (3% default)
- merchantAmount + feeAmount === amount
- sets expiry to 30 min from creation
- stores metadata
- creates with custom fee percent
- rejects amount <= 0
- rejects unsupported currency
- rejects missing required fields
- god check passes after creation (no ledger entries yet for created state)

### Idempotency (~15 tests)

- same key returns same response (no duplicate creation)
- same key with different params returns 409
- expired key allows reuse
- concurrent requests with same key: only one succeeds
- idempotency key stored with 24h TTL
- double-check pattern: pre-tx check + in-tx check
- different endpoints can use same idempotency key
- key not required for GET requests
- missing key on POST returns 400
- key with special characters works
- key max length enforced (256 chars)
- cleanup of expired keys
- idempotent response matches original status code
- idempotent response matches original body
- key stored atomically with resource creation

### Confirm Flow (~15 tests)

- confirms created payment
- posts hold ledger entries
- rejects confirming expired payment (lazy expiry)
- rejects confirming canceled payment
- rejects confirming already confirmed payment
- confirms with payment method info
- concurrent confirm attempts: only one succeeds (FOR UPDATE)
- god check passes after confirm
- hold entries balance: debit holds = credit available
- updates payment status to confirmed
- updates payment updatedAt
- account holder balance reflects hold
- confirm transitions through processing to succeeded
- ledger entries posted for fee split on success
- merchant balance increases after success

### Cancel Flow (~10 tests)

- cancels created payment (no ledger entries)
- cancels confirmed payment (reverses hold)
- rejects canceling processing payment
- rejects canceling succeeded payment
- rejects canceling already canceled payment
- god check passes after cancel
- hold reversal entries balance
- payment status updated to canceled
- concurrent cancel + confirm: one wins
- canceled payment expires_at cleared

### Refund Flow (~25 tests)

- full refund from succeeded
- partial refund from succeeded
- multiple partial refunds
- partial refund then full refund (remaining)
- rejects refund exceeding available amount
- rejects refund from created/confirmed/canceled/expired
- refund from partially_refunded
- proportional fee reversal on refund
- refundMerchant + refundFee === refundAmount
- full refund: status → refunded
- partial refund: status → partially_refunded
- final partial refund: status → refunded
- refundedAmount updated correctly
- zero-amount refund rejected
- refund amount cannot exceed (amount - refundedAmount)
- ledger entries balance after refund
- god check passes after refund
- merchant balance decreases after refund
- platform fees decrease after refund
- concurrent refunds: one succeeds, one gets updated balance
- refund of 1 cent payment (minimum)
- refund with zero fee (small original amount)
- full refund restores all fee
- partial refund reverses proportional fee
- idempotent refund

### Expiry (~10 tests)

- payment expires after 30 min
- expired payment cannot be confirmed
- expired payment cannot be canceled (already terminal)
- expiry detected on access (lazy)
- expired confirmed payment reverses hold
- expired confirmed payment: god check passes
- listing includes expired payments
- expiry does not affect succeeded payments
- custom expiry duration (if supported)
- expired payment returns correct error message

### Fee Calculation (~15 tests)

- 3% of $100 = $3
- 3% of $1 = $0.03 (3 cents)
- 3% of $0.01 (1 cent) = $0 (fee rounds to 0)
- 3% of $0.10 (10 cents) = $0 (rounds down)
- 3% of $0.34 (34 cents) = $0.01 (1 cent)
- merchantShare + fee === amount for all above
- custom fee percent: 0% → fee = 0
- custom fee percent: 10% → correct calculation
- custom fee percent: 100% → merchant gets 0
- fee with EUR (2 decimals)
- fee with USDC (6 decimals)
- large amount: $1,000,000
- very small amount: 1 minor unit
- splitAmount matches calculateFee + subtraction
- property: for any amount and fee%, merchantShare + fee === amount

### Concurrency (~10 tests)

- parallel confirms: only one succeeds
- parallel confirm + cancel: one succeeds
- parallel refunds: correct final balance
- FOR UPDATE prevents race conditions
- deadlock does not occur (consistent lock ordering)
- transaction rollback on conflict
- status check inside transaction (not stale)
- concurrent payments to same merchant: independent
- sequential operations maintain consistency
- god check after concurrent operations

### API Integration (~15 tests)

- POST /api/v1/payment-intents creates payment
- POST /api/v1/payment-intents requires Idempotency-Key
- GET /api/v1/payment-intents/:id returns payment
- GET /api/v1/payment-intents lists with pagination
- GET /api/v1/payment-intents?status=succeeded filters
- POST /api/v1/payment-intents/:id/confirm transitions
- POST /api/v1/payment-intents/:id/cancel transitions
- POST /api/v1/payment-intents/:id/refund with amount
- POST /api/v1/payment-intents/:id/refund without amount (full)
- GET /api/v1/payment-intents/:id/ledger returns entries
- 404 for non-existent payment
- 409 for invalid state transition
- 409 for idempotency conflict
- 422 for invalid refund amount
- amounts serialized as strings in responses

### Cross-Package (~5 tests)

- payment → ledger: entries posted correctly
- payment → accounts: merchant balance updated
- payment → ledger → god check: system balanced
- full lifecycle: create → confirm → succeed → refund → god check
- multiple payments to same merchant: balances accumulate

## Test Organization

```
packages/tests/phase-2/
  state-machine.test.ts    — State transition validation
  payment-crud.test.ts     — Creation, reading, listing
  idempotency.test.ts      — Dedup and conflict handling
  confirm.test.ts          — Confirm flow + ledger
  cancel.test.ts           — Cancel flow
  refund.test.ts           — Refund flow + proportional fees
  expiry.test.ts           — Lazy expiry
  fees.test.ts             — Fee calculation edge cases
  concurrency.test.ts      — Race conditions + locking
  api.test.ts              — HTTP endpoint integration
  cross-package.test.ts    — Full lifecycle
```
