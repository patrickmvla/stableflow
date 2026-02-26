# Phase 1: Accounts

## Package: `packages/accounts/`

Manages account holders (merchants) and their virtual accounts. Virtual accounts are the bridge between business entities and the ledger.

## Account Holder

A merchant or business using StableFlow.

```typescript
interface AccountHolder {
  id: string;           // "acc_01JQXR..."
  name: string;
  email: string;
  status: "active" | "suspended";
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Virtual Account

A currency-specific sub-account. Each virtual account maps 1:1 to a ledger account.

```typescript
interface VirtualAccount {
  id: string;            // "vac_01JQXR..."
  accountHolderId: string;
  currency: Currency;
  ledgerAccountId: string;  // The corresponding ledger account
  type: "fiat" | "stablecoin";
  network?: string;         // For stablecoins: "ethereum", "polygon", etc.
  status: "active" | "frozen";
  createdAt: Date;
}
```

When a virtual account is created, a corresponding ledger account is also created:
- **Ledger account ID:** `merchant:{acc_id}:available:{currency}`
- **Ledger account type:** `liability` (money the platform owes the merchant)

A corresponding holds account is also created:
- **Ledger account ID:** `merchant:{acc_id}:holds:{currency}`
- **Ledger account type:** `asset` (funds held during payment processing)

## Service Functions

### `createAccountHolder(db, input)`

```typescript
interface CreateAccountHolderInput {
  name: string;
  email: string;
  metadata?: Record<string, unknown>;
}

async function createAccountHolder(db: Database, input: CreateAccountHolderInput): Promise<AccountHolder>;
```

Validates email format, generates `acc_` prefixed ID, inserts row.

### `getAccountHolder(db, id)`

Returns account holder or throws `AccountNotFoundError`.

### `listAccountHolders(db, pagination)`

Cursor-paginated list of account holders.

### `createVirtualAccount(db, input)`

```typescript
interface CreateVirtualAccountInput {
  accountHolderId: string;
  currency: Currency;
  network?: string;  // Required for stablecoin accounts
}

async function createVirtualAccount(db: Database, input: CreateVirtualAccountInput): Promise<VirtualAccount>;
```

**Steps:**
1. Verify account holder exists
2. Determine type: fiat if USD/EUR, stablecoin if USDC/USDT
3. If stablecoin, require network
4. Check no duplicate (same holder + currency + network)
5. Inside transaction:
   - Create ledger account (`merchant:{acc_id}:available:{currency}`)
   - Create holds ledger account (`merchant:{acc_id}:holds:{currency}`)
   - Create virtual account row mapping to ledger account
6. Return virtual account

### `getVirtualAccount(db, id)`

Returns virtual account or throws `NotFoundError`.

### `listVirtualAccounts(db, accountHolderId)`

All virtual accounts for an account holder.

### `getVirtualAccountBalance(db, virtualAccountId)`

Delegates to ledger's `getBalance()` using the mapped `ledgerAccountId`.

```typescript
async function getVirtualAccountBalance(db: Database, id: string): Promise<{
  amount: bigint;
  currency: Currency;
  formatted: string;
}>;
```

## Constraints

- One virtual account per (account_holder_id, currency, network) combination
- Account holder email must be valid format
- Cannot create virtual account for suspended account holder
- Virtual account status: active accounts can transact, frozen cannot

## Relationship to Ledger

```
AccountHolder (acc_)
  └── VirtualAccount (vac_) ←→ LedgerAccount (merchant:{acc_id}:available:{currency})
                              + LedgerAccount (merchant:{acc_id}:holds:{currency})
```

Balance query flow:
1. API receives `GET /accounts/:id/virtual-accounts/:vid/balance`
2. Look up virtual account → get `ledgerAccountId`
3. Call `ledger.getBalance(db, ledgerAccountId)`
4. Return formatted balance
