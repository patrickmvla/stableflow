-- Immutability function
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger records are immutable. % operations are not allowed.', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- Immutability triggers on ledger_transactions
CREATE TRIGGER prevent_ledger_transaction_mutation
  BEFORE UPDATE OR DELETE ON ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- Immutability triggers on ledger_entries
CREATE TRIGGER prevent_ledger_entry_mutation
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- Immutability triggers on audit_logs
CREATE TRIGGER prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- CHECK constraints
ALTER TABLE ledger_accounts
  ADD CONSTRAINT chk_ledger_accounts_type CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  ADD CONSTRAINT chk_ledger_accounts_currency CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT'));

ALTER TABLE ledger_entries
  ADD CONSTRAINT chk_ledger_entries_direction CHECK (direction IN ('DEBIT', 'CREDIT')),
  ADD CONSTRAINT chk_ledger_entries_amount CHECK (amount > 0),
  ADD CONSTRAINT chk_ledger_entries_currency CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT'));

ALTER TABLE ledger_transactions
  ADD CONSTRAINT chk_ledger_transactions_reference_type CHECK (
    reference_type IS NULL OR reference_type IN ('payment', 'settlement', 'adjustment')
  );

ALTER TABLE account_holders
  ADD CONSTRAINT chk_account_holders_status CHECK (status IN ('active', 'suspended'));

ALTER TABLE virtual_accounts
  ADD CONSTRAINT chk_virtual_accounts_currency CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  ADD CONSTRAINT chk_virtual_accounts_type CHECK (type IN ('fiat', 'stablecoin')),
  ADD CONSTRAINT chk_virtual_accounts_status CHECK (status IN ('active', 'frozen'));

ALTER TABLE api_keys
  ADD CONSTRAINT uq_api_keys_hash UNIQUE (key_hash);

ALTER TABLE audit_logs
  ADD CONSTRAINT chk_audit_logs_actor_type CHECK (actor_type IN ('api_key', 'system'));

-- Seed system ledger accounts
INSERT INTO ledger_accounts (id, name, type, currency) VALUES
  ('platform:fees:USD',  'Platform Fees (USD)',  'revenue',  'USD'),
  ('platform:fees:EUR',  'Platform Fees (EUR)',  'revenue',  'EUR'),
  ('platform:fees:USDC', 'Platform Fees (USDC)', 'revenue',  'USDC'),
  ('platform:fees:USDT', 'Platform Fees (USDT)', 'revenue',  'USDT'),
  ('platform:cash:USD',  'Platform Cash (USD)',  'asset',    'USD'),
  ('platform:cash:EUR',  'Platform Cash (EUR)',  'asset',    'EUR'),
  ('platform:cash:USDC', 'Platform Cash (USDC)', 'asset',    'USDC'),
  ('platform:cash:USDT', 'Platform Cash (USDT)', 'asset',    'USDT'),
  ('platform:gas:USD',   'Platform Gas Fees (USD)',  'expense', 'USD'),
  ('platform:gas:USDC',  'Platform Gas Fees (USDC)', 'expense', 'USDC'),
  ('platform:gas:USDT',  'Platform Gas Fees (USDT)', 'expense', 'USDT')
ON CONFLICT (id) DO NOTHING;
