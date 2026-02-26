# Phase 2: Data Model

## New Tables

### `payment_intents`

```sql
CREATE TABLE payment_intents (
  id TEXT PRIMARY KEY,                          -- "pay_01JQXR..."
  account_holder_id TEXT NOT NULL REFERENCES account_holders(id),
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'confirmed', 'processing', 'succeeded',
                      'canceled', 'expired', 'refunded', 'partially_refunded')),
  amount BIGINT NOT NULL
    CHECK (amount > 0),
  currency TEXT NOT NULL
    CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  fee_percent INTEGER NOT NULL DEFAULT 3
    CHECK (fee_percent >= 0 AND fee_percent <= 100),
  fee_amount BIGINT NOT NULL
    CHECK (fee_amount >= 0),
  merchant_amount BIGINT NOT NULL
    CHECK (merchant_amount >= 0),
  refunded_amount BIGINT NOT NULL DEFAULT 0
    CHECK (refunded_amount >= 0),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Invariants
  CHECK (fee_amount + merchant_amount = amount),
  CHECK (refunded_amount <= amount)
);

CREATE INDEX idx_payment_intents_holder ON payment_intents(account_holder_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_created ON payment_intents(created_at);
CREATE UNIQUE INDEX idx_payment_intents_idempotency ON payment_intents(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

### `idempotency_keys`

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,                  -- "payment_intent"
  resource_id TEXT NOT NULL,
  response_code INTEGER NOT NULL,              -- HTTP status code
  response_body JSONB NOT NULL,                -- Cached response
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL              -- 24h TTL
);

CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);
```

## Updated Tables

No changes to Phase 1 tables. Payment intents reference `account_holders` and generate `ledger_transactions` + `ledger_entries` through the ledger service.

## Relationships

```
payment_intents.account_holder_id → account_holders.id
payment_intents → ledger_transactions (via reference_type='payment', reference_id=pay_id)
idempotency_keys.resource_id → payment_intents.id (logical, not FK)
```

## Indexes for Performance

- `account_holder_id` — filter payments by merchant
- `status` — filter by payment status
- `created_at` — cursor pagination ordering
- `idempotency_key` — unique partial index for dedup
- `expires_at` on idempotency_keys — for TTL cleanup

## Data Integrity

### CHECK Constraints
- `amount > 0` — no zero or negative payments
- `fee_amount >= 0` — fee can be 0 for small amounts
- `merchant_amount >= 0` — merchant always gets non-negative
- `fee_amount + merchant_amount = amount` — no rounding loss
- `refunded_amount <= amount` — can't refund more than paid
- `fee_percent BETWEEN 0 AND 100` — valid percentage

### State Machine Enforcement
Enforced in application code via `validateTransition()`, not in DB triggers. This keeps the state machine logic testable and gives better error messages.

## Migration

Phase 2 migration adds:
1. `payment_intents` table with all constraints
2. `idempotency_keys` table
3. Indexes
