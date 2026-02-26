# Domain Model

## Overview

StableFlow is a fiat-to-stablecoin settlement platform. Merchants accept fiat payments (USD, EUR) and receive settlements in stablecoins (USDC, USDT) on their preferred blockchain network.

## Money Flow

```
Customer → Payment Intent → Merchant Virtual Account (fiat)
                                    ↓
                            Settlement Pipeline
                                    ↓
                            Network Selection (cheapest/fastest)
                                    ↓
                            Blockchain Confirmation
                                    ↓
                            Merchant Virtual Account (stablecoin)
```

## Core Concepts

### Account Holder
A merchant or business entity that uses StableFlow. Each account holder has one or more virtual accounts.

- **ID prefix:** `acc_`
- **Fields:** name, email, status (active/suspended), metadata
- Has many: virtual accounts, payment intents, API keys

### Virtual Account
A currency-specific sub-account within an account holder. Each virtual account maps to a ledger account for balance tracking.

- **ID prefix:** `vac_`
- **Types:** Fiat (USD, EUR) or Stablecoin (USDC per network, USDT per network)
- **Balance:** Derived from ledger entries (never stored directly)
- Belongs to: account holder
- Maps to: ledger account

### Ledger Account
An account in the double-entry bookkeeping system. Balances are computed from the sum of debit/credit entries.

- **ID prefix:** `lac_`
- **Types:** asset, liability, equity, revenue, expense
- **Currency:** Single currency per account
- **Balance formula:** `SUM(debits) - SUM(credits)` for asset/expense accounts; `SUM(credits) - SUM(debits)` for liability/revenue/equity

### Ledger Transaction
An atomic group of ledger entries that must balance (total debits = total credits within the same currency).

- **ID prefix:** `txn_`
- **Immutable:** INSERT only, no UPDATE or DELETE
- **Fields:** description, reference_type, reference_id, entries[]

### Ledger Entry
A single debit or credit in a ledger transaction.

- **ID prefix:** `ent_`
- **Immutable:** INSERT only, no UPDATE or DELETE
- **Fields:** transaction_id, account_id, direction (DEBIT/CREDIT), amount (bigint > 0), currency

### Payment Intent
A request to collect a payment from a customer. Progresses through a state machine.

- **ID prefix:** `pay_`
- **States:** created → confirmed → processing → succeeded | canceled | expired
- **Fields:** amount, currency, account_holder_id, status, fee_amount, metadata

### Settlement
The process of converting a merchant's fiat balance to stablecoins on a blockchain network.

- **ID prefix:** `stl_`
- **States:** pending → submitting → submitted → confirming → confirmed → settled | failed | retrying | abandoned
- **Fields:** payment_intent_id, source_currency, target_currency, network, gas_fee, confirmations

### Product
A catalog item that a merchant sells.

- **ID prefix:** `prd_`
- **Fields:** name, description, price, currency, inventory_count, account_holder_id

### Payment Link
A shareable URL that creates a payment intent when accessed.

- **ID prefix:** `lnk_`
- **Fields:** slug, product_id, single_use, expires_at

### API Key
Authentication credential for API access.

- **ID prefix:** `key_`
- **Fields:** name, key_hash (SHA-256), prefix (first 8 chars), account_holder_id, revoked_at

### Domain Event
An immutable record of something that happened in the system. Used for the transactional outbox pattern and SSE broadcasting.

- **ID prefix:** `evt_`
- **Fields:** aggregate_type, aggregate_id, event_type, payload, published_at

## Glossary

| Term | Definition |
|------|-----------|
| **Double-entry bookkeeping** | Every transaction has equal debits and credits |
| **God check** | System-wide verification that all debits equal all credits per currency |
| **Idempotency** | Same request with same key produces same result |
| **Pessimistic locking** | `SELECT ... FOR UPDATE` to prevent concurrent modifications |
| **Transactional outbox** | Events written to DB in same transaction as state change, then published |
| **SSE** | Server-Sent Events for real-time push to dashboard |
| **Gas fee** | Blockchain transaction cost |
| **Confirmation** | Blockchain block confirmations required before settlement is final |
| **USDC** | USD Coin — a stablecoin pegged 1:1 to USD |
| **USDT** | Tether — a stablecoin pegged 1:1 to USD |

## System Accounts (Ledger)

These are seeded at startup and form the backbone of the accounting system:

| Account | Type | Purpose |
|---------|------|---------|
| `platform:fees:{currency}` | revenue | Platform fee income |
| `platform:cash:{currency}` | asset | Platform settlement holding |
| `platform:gas:{currency}` | expense | Gas fees paid for settlements |

Per-merchant virtual accounts are created dynamically and map to ledger accounts:
- `merchant:{acc_id}:{currency}` — liability account (money owed to merchant)
- `holds:{acc_id}:{currency}` — asset account (funds held during processing)

## Currency Support

### Fiat
- **USD** — US Dollar (2 decimals, minor unit: cents)
- **EUR** — Euro (2 decimals, minor unit: cents)

### Stablecoins
- **USDC** — USD Coin (6 decimals, minor unit: micro-USDC)
- **USDT** — Tether (6 decimals, minor unit: micro-USDT)

### Exchange Rate
For MVP, 1 USD = 1 USDC = 1 USDT (stablecoins are pegged). Cross-currency settlement handles the decimal conversion (2 → 6 decimals).
