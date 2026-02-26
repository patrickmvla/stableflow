# System Invariants

These invariants are non-negotiable. Every test, every mutation, every deployment must preserve them.

## Ledger Invariants

### INV-L1: Transaction Balance
Every ledger transaction must balance: `SUM(debit amounts) === SUM(credit amounts)` within the same currency. Enforced at insert time in application code and verified by god check.

### INV-L2: Entry Immutability
Ledger entries and transactions are INSERT only. SQL triggers block UPDATE and DELETE operations. No exceptions.

### INV-L3: Positive Amounts
All ledger entry amounts must be > 0. Enforced by CHECK constraint: `amount > 0`.

### INV-L4: God Check (System Balance)
`SUM(all debits) === SUM(all credits)` across the entire system, per currency. Verified after every financial mutation in tests. Available as an API endpoint.

### INV-L5: Derived Balances
Account balances are never stored — always computed from `SUM(entries)`. No balance column exists on any account table.

### INV-L6: Single Currency Per Account
Each ledger account holds exactly one currency. Multi-currency merchants have separate ledger accounts per currency.

### INV-L7: Valid Account References
Every ledger entry references an existing ledger account. Foreign key constraint enforced.

## Payment Invariants

### INV-P1: State Machine Discipline
Payment intent state transitions follow the defined state machine. No skipping states, no backward transitions. Enforced in application code via `validateTransition()`.

### INV-P2: Fee Integrity
`merchant_amount + fee_amount === total_amount` exactly. No rounding loss. BigInt arithmetic ensures this.

### INV-P3: Refund Limits
`refunded_amount <= captured_amount`. Partial refunds tracked cumulatively. CHECK constraint enforced.

### INV-P4: Idempotency
Same `Idempotency-Key` + same parameters = same response. Double-check pattern: verify before and inside transaction.

### INV-P5: Pessimistic Locking
All payment mutations acquire `SELECT ... FOR UPDATE` on the payment row before state transition. Prevents race conditions.

### INV-P6: Ledger Entries Per Transition
Every payment state transition that moves money posts exactly the required ledger entries. No transition without corresponding ledger activity.

## Settlement Invariants

### INV-S1: Settlement State Machine
Settlement state transitions follow: `pending → submitting → submitted → confirming → confirmed → settled`. Failure branch: `→ failed → retrying → ...` or `→ abandoned`.

### INV-S2: Amount Preservation
Settlement target amount = source amount after fee deduction, adjusted for decimal conversion. No value created or destroyed.

### INV-S3: Network Selection Determinism
Given the same inputs (amount, available networks, gas prices), network selection produces the same result. Scoring algorithm is pure.

### INV-S4: Confirmation Threshold
A settlement is not `confirmed` until it reaches the required number of block confirmations for its network.

### INV-S5: Event Completeness
Every settlement state transition produces a domain event. The full settlement lifecycle can be reconstructed from events alone.

### INV-S6: Cross-Currency God Check
When settling USD → USDC: the USD debit amount (in minor units) must equal the USDC credit amount after decimal adjustment (cents → micro-USDC, multiply by 10^4 for 1:1 peg).

## Product Invariants

### INV-PR1: Inventory Integrity
Inventory count never goes negative. Decremented with `SELECT ... FOR UPDATE` + CHECK constraint.

### INV-PR2: Single-Use Links
A single-use payment link cannot be used after its first successful payment. Enforced by status flag.

### INV-PR3: Slug Uniqueness
Payment link slugs are globally unique. UNIQUE constraint on the slug column.

## Auth Invariants

### INV-A1: Key Hash Only
API key plaintext is never stored. Only the SHA-256 hash is persisted. Plaintext shown once at creation.

### INV-A2: Audit Completeness
Every state-changing API call produces an audit log entry. Includes actor, action, resource, timestamp, IP.

### INV-A3: Revocation Finality
A revoked API key cannot be un-revoked. `revoked_at` timestamp is immutable once set.

## Verification Strategy

| Invariant | Enforcement | Verification |
|-----------|-------------|-------------|
| INV-L1 | Application code | God check after every mutation |
| INV-L2 | SQL triggers | Integration tests attempt UPDATE/DELETE |
| INV-L3 | CHECK constraint | Unit tests with invalid amounts |
| INV-L4 | God check endpoint | Automated in test teardown |
| INV-L5 | No balance column | Schema inspection test |
| INV-P1 | `validateTransition()` | Unit tests for every invalid transition |
| INV-P2 | BigInt arithmetic | Property-based tests |
| INV-P5 | `FOR UPDATE` | Concurrent mutation tests |
| INV-S3 | Pure function | Deterministic unit tests |
| INV-S5 | Outbox pattern | Witness reconstruction test |
