# Phase 3: Data Model

## New Tables

### `settlements`

```sql
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,                              -- "stl_01JQXR..."
  payment_intent_id TEXT NOT NULL REFERENCES payment_intents(id),
  account_holder_id TEXT NOT NULL REFERENCES account_holders(id),
  source_currency TEXT NOT NULL
    CHECK (source_currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  source_amount BIGINT NOT NULL
    CHECK (source_amount > 0),
  target_currency TEXT NOT NULL
    CHECK (target_currency IN ('USDC', 'USDT')),
  target_amount BIGINT NOT NULL
    CHECK (target_amount > 0),
  network TEXT NOT NULL,
  network_selection_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitting', 'submitted', 'confirming',
                      'confirmed', 'settled', 'failed', 'retrying', 'abandoned')),
  tx_hash TEXT,
  gas_estimate BIGINT NOT NULL DEFAULT 0
    CHECK (gas_estimate >= 0),
  gas_actual BIGINT
    CHECK (gas_actual IS NULL OR gas_actual >= 0),
  confirmations INTEGER NOT NULL DEFAULT 0
    CHECK (confirmations >= 0),
  confirmations_required INTEGER NOT NULL
    CHECK (confirmations_required > 0),
  retry_count INTEGER NOT NULL DEFAULT 0
    CHECK (retry_count >= 0),
  max_retries INTEGER NOT NULL DEFAULT 3
    CHECK (max_retries >= 0),
  error TEXT,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_payment ON settlements(payment_intent_id);
CREATE INDEX idx_settlements_holder ON settlements(account_holder_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_network ON settlements(network);
CREATE INDEX idx_settlements_created ON settlements(created_at);
```

### `domain_events`

```sql
CREATE TABLE domain_events (
  id TEXT PRIMARY KEY,                              -- "evt_01JQXR..."
  aggregate_type TEXT NOT NULL,                     -- "settlement", "payment"
  aggregate_id TEXT NOT NULL,                       -- Entity ID
  event_type TEXT NOT NULL,                         -- "settlement.status_changed"
  payload JSONB NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,                         -- NULL until broadcast via SSE
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_domain_events_aggregate
  ON domain_events(aggregate_type, aggregate_id);
CREATE INDEX idx_domain_events_unpublished
  ON domain_events(created_at) WHERE published_at IS NULL;
CREATE INDEX idx_domain_events_type ON domain_events(event_type);
CREATE INDEX idx_domain_events_created ON domain_events(created_at);

-- IMMUTABILITY TRIGGER (events are append-only)
CREATE TRIGGER prevent_domain_event_mutation
  BEFORE UPDATE ON domain_events
  FOR EACH ROW
  WHEN (OLD.published_at IS NOT NULL)
  EXECUTE FUNCTION prevent_ledger_mutation();

-- Note: published_at can be set once (NULL → timestamp), but not changed after
```

### `settlement_events` (Detailed Settlement Log)

```sql
CREATE TABLE settlement_events (
  id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL REFERENCES settlements(id),
  event_type TEXT NOT NULL,                         -- "status_changed", "confirmation_progress", etc.
  from_status TEXT,
  to_status TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlement_events_settlement ON settlement_events(settlement_id);
CREATE INDEX idx_settlement_events_created ON settlement_events(created_at);

-- IMMUTABILITY
CREATE TRIGGER prevent_settlement_event_mutation
  BEFORE UPDATE OR DELETE ON settlement_events
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
```

## Relationships

```
settlements.payment_intent_id → payment_intents.id
settlements.account_holder_id → account_holders.id
settlement_events.settlement_id → settlements.id
domain_events (logical reference via aggregate_type + aggregate_id)
```

## Migration

Phase 3 migration adds:
1. `settlements` table with all constraints
2. `domain_events` table with outbox pattern support
3. `settlement_events` table for detailed audit trail
4. All indexes
5. Immutability triggers on event tables
