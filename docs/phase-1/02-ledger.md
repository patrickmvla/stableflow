# Phase 1: Double-Entry Ledger

## Package: `packages/ledger/`

The financial backbone. Every cent that moves through StableFlow is recorded as balanced double-entry transactions.

## Core Principle

For every debit, there is an equal and opposite credit. The system cannot create or destroy money.

## Ledger Accounts

Each ledger account holds a single currency and has a type that determines its normal balance direction.

```typescript
type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

interface LedgerAccount {
  id: string;          // "lac_..." or semantic like "platform:fees:USD"
  name: string;
  type: AccountType;
  currency: Currency;
  createdAt: Date;
}
```

**Balance computation:**
- Asset & Expense accounts: `SUM(debits) - SUM(credits)`
- Liability, Revenue & Equity accounts: `SUM(credits) - SUM(debits)`

## System Accounts (Seeded)

Created at startup for each supported currency (USD, EUR, USDC, USDT):

| Account Pattern | Type | Purpose |
|----------------|------|---------|
| `platform:fees:{currency}` | revenue | Platform fee income |
| `platform:cash:{currency}` | asset | Platform settlement holding |
| `platform:gas:{currency}` | expense | Blockchain gas fees |

## Dynamic Accounts (Per Merchant)

Created when a merchant creates a virtual account:

| Account Pattern | Type | Purpose |
|----------------|------|---------|
| `merchant:{acc_id}:available:{currency}` | liability | Available merchant balance |
| `merchant:{acc_id}:holds:{currency}` | asset | Funds held during processing |

## Transactions and Entries

```typescript
interface TransactionInput {
  description: string;
  referenceType?: string;  // "payment", "settlement", "adjustment"
  referenceId?: string;    // The related entity ID
  entries: EntryInput[];
}

interface EntryInput {
  accountId: string;
  direction: "DEBIT" | "CREDIT";
  amount: bigint;     // Must be > 0
  currency: Currency;
}
```

## Service Functions

### `postTransaction(db, input)`

The core function. Atomic, balanced, immutable.

```typescript
async function postTransaction(db: Database, input: TransactionInput): Promise<LedgerTransaction>;
```

**Steps:**
1. Validate minimum 2 entries
2. Validate all amounts > 0
3. Group entries by currency, verify debits === credits per currency
4. Verify all referenced accounts exist and currency matches
5. Inside transaction:
   - INSERT ledger_transaction row
   - INSERT all ledger_entry rows
6. Return full transaction with entries

**Throws:** `LedgerImbalanceError` if debits ≠ credits.

### `getBalance(db, accountId)`

Compute balance from entries.

```typescript
async function getBalance(db: Database, accountId: string): Promise<{ amount: bigint; currency: Currency }>;
```

**SQL:**
```sql
SELECT
  COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits,
  COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits
FROM ledger_entries
WHERE account_id = $1
```

Then apply account type to determine balance direction.

### `getTransactionsByReference(db, referenceType, referenceId)`

Get all ledger transactions for a payment or settlement.

### `getAllAccounts(db)`

List all ledger accounts with computed balances.

### `godCheck(db)`

The system integrity verification.

```typescript
async function godCheck(db: Database): Promise<GodCheckResult>;

interface GodCheckResult {
  balanced: boolean;
  currencies: {
    [currency: string]: {
      totalDebits: bigint;
      totalCredits: bigint;
      balanced: boolean;
    };
  };
}
```

**SQL:**
```sql
SELECT
  currency,
  SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END)::bigint AS total_debits,
  SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END)::bigint AS total_credits
FROM ledger_entries
GROUP BY currency
```

Returns `balanced: true` only if every currency balances.

## Immutability

SQL triggers on `ledger_transactions` and `ledger_entries`:

```sql
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger records are immutable. % operations are not allowed.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ledger_transaction_update
  BEFORE UPDATE OR DELETE ON ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER prevent_ledger_entry_update
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
```

## Drizzle Schema

See `phase-1/06-data-model.md` for complete table definitions.

## Key Invariants

- **INV-L1:** Every transaction balances per currency
- **INV-L2:** Entries are immutable (triggers)
- **INV-L3:** All amounts > 0
- **INV-L4:** God check passes per currency
- **INV-L5:** Balances derived, never stored
- **INV-L6:** Single currency per ledger account
