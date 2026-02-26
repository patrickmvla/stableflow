# Phase 1: Data Model

## Database: PostgreSQL 16

All tables defined with Drizzle ORM in their respective package `schema.ts` files.

## Tables

### `account_holders`

```sql
CREATE TABLE account_holders (
  id TEXT PRIMARY KEY,                          -- "acc_01JQXR..."
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_holders_email ON account_holders(email);
CREATE INDEX idx_account_holders_status ON account_holders(status);
```

### `virtual_accounts`

```sql
CREATE TABLE virtual_accounts (
  id TEXT PRIMARY KEY,                          -- "vac_01JQXR..."
  account_holder_id TEXT NOT NULL REFERENCES account_holders(id),
  currency TEXT NOT NULL
    CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  type TEXT NOT NULL
    CHECK (type IN ('fiat', 'stablecoin')),
  network TEXT,                                 -- NULL for fiat, required for stablecoin
  ledger_account_id TEXT NOT NULL,              -- Maps to ledger_accounts.id
  holds_ledger_account_id TEXT NOT NULL,        -- Maps to holds ledger account
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (account_holder_id, currency, network)
);

CREATE INDEX idx_virtual_accounts_holder ON virtual_accounts(account_holder_id);
```

### `ledger_accounts`

```sql
CREATE TABLE ledger_accounts (
  id TEXT PRIMARY KEY,                          -- "platform:fees:USD" or "merchant:acc_01:available:USD"
  name TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  currency TEXT NOT NULL
    CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_accounts_type ON ledger_accounts(type);
CREATE INDEX idx_ledger_accounts_currency ON ledger_accounts(currency);
```

### `ledger_transactions`

```sql
CREATE TABLE ledger_transactions (
  id TEXT PRIMARY KEY,                          -- "txn_01JQXR..."
  description TEXT NOT NULL,
  reference_type TEXT,                          -- "payment", "settlement", "adjustment"
  reference_id TEXT,                            -- Related entity ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_transactions_reference
  ON ledger_transactions(reference_type, reference_id);

-- IMMUTABILITY TRIGGER
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger records are immutable. % operations are not allowed.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ledger_transaction_mutation
  BEFORE UPDATE OR DELETE ON ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
```

### `ledger_entries`

```sql
CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,                          -- "ent_01JQXR..."
  transaction_id TEXT NOT NULL REFERENCES ledger_transactions(id),
  account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
  direction TEXT NOT NULL
    CHECK (direction IN ('DEBIT', 'CREDIT')),
  amount BIGINT NOT NULL
    CHECK (amount > 0),
  currency TEXT NOT NULL
    CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_currency ON ledger_entries(currency);

-- IMMUTABILITY TRIGGER
CREATE TRIGGER prevent_ledger_entry_mutation
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
```

### `api_keys`

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,                          -- "key_01JQXR..."
  account_holder_id TEXT NOT NULL REFERENCES account_holders(id),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,                         -- "sf_live_"
  key_hash TEXT NOT NULL,                       -- SHA-256 of full key
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ                        -- NULL = active
);

CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_holder ON api_keys(account_holder_id);
```

### `audit_logs`

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,                          -- "aud_01JQXR..."
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('api_key', 'system')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,                         -- "account.created", "payment.confirmed"
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- IMMUTABILITY TRIGGER
CREATE TRIGGER prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
```

## Migration Strategy

Drizzle Kit generates migrations from schema changes:

```bash
bun run db:generate  # Generate SQL migration from schema diff
bun run db:migrate   # Apply pending migrations
```

Initial migration creates all Phase 1 tables + triggers + system account seeds.

## Seed Data

System ledger accounts seeded on first migration:

```sql
-- Platform accounts for each currency
INSERT INTO ledger_accounts (id, name, type, currency) VALUES
  ('platform:fees:USD', 'Platform Fees (USD)', 'revenue', 'USD'),
  ('platform:fees:EUR', 'Platform Fees (EUR)', 'revenue', 'EUR'),
  ('platform:fees:USDC', 'Platform Fees (USDC)', 'revenue', 'USDC'),
  ('platform:fees:USDT', 'Platform Fees (USDT)', 'revenue', 'USDT'),
  ('platform:cash:USD', 'Platform Cash (USD)', 'asset', 'USD'),
  ('platform:cash:EUR', 'Platform Cash (EUR)', 'asset', 'EUR'),
  ('platform:cash:USDC', 'Platform Cash (USDC)', 'asset', 'USDC'),
  ('platform:cash:USDT', 'Platform Cash (USDT)', 'asset', 'USDT'),
  ('platform:gas:USD', 'Platform Gas Fees (USD)', 'expense', 'USD'),
  ('platform:gas:USDC', 'Platform Gas Fees (USDC)', 'expense', 'USDC'),
  ('platform:gas:USDT', 'Platform Gas Fees (USDT)', 'expense', 'USDT');
```
