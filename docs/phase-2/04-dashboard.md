# Phase 2: Dashboard Updates

## New Pages

### Payments Page (`/payments`)

List and manage payment intents.

**Payment Intents Table:**
| ID | Amount | Currency | Status | Description | Created |
|----|--------|----------|--------|-------------|---------|
| pay_01... | $100.00 | USD | Succeeded | Order #1234 | Feb 24, 2026 |
| pay_01... | $50.00 | USD | Created | Order #1235 | Feb 24, 2026 |

**Status Badges:**
- `created` — gray
- `confirmed` — blue
- `processing` — yellow/amber
- `succeeded` — green
- `canceled` — red
- `expired` — dark gray
- `refunded` — purple
- `partially_refunded` — orange

**Filters:**
- Status dropdown (all, created, confirmed, processing, succeeded, canceled, expired, refunded)
- Cursor pagination (Previous / Next)

**Actions:**
- "Create Payment" button → opens create form

**Create Payment Form (modal):**
```
Amount:      [______] (in dollars, converted to cents)
Currency:    [USD ▼]
Description: [______]
```

On submit: `POST /api/v1/payment-intents` with `Idempotency-Key` header.

### Payment Detail Page (`/payments/:id`)

Detailed view of a single payment intent.

**Header:**
```
Payment pay_01JQXR5...
Status: [Succeeded ✓]
```

**Details Card:**
| Field | Value |
|-------|-------|
| Amount | $100.00 |
| Currency | USD |
| Fee (3%) | $3.00 |
| Merchant Amount | $97.00 |
| Refunded | $0.00 |
| Description | Order #1234 |
| Created | Feb 24, 2026, 12:00 PM |
| Expires | Feb 24, 2026, 12:30 PM |

**State Machine Timeline:**

Visual timeline showing the payment's progression:

```
● Created (12:00:00)
│
● Confirmed (12:00:05)
│
● Processing (12:00:05)
│
● Succeeded (12:00:06)
```

Each dot is color-coded by status. Future states shown as hollow circles.

**Ledger Entries:**

Table of all ledger transactions for this payment:

| Transaction | Description | Entries |
|------------|-------------|---------|
| txn_01... | Payment succeeded | platform:cash:USD DEBIT $100.00, merchant:...:available:USD CREDIT $97.00, platform:fees:USD CREDIT $3.00 |

**Actions:**
- "Confirm" button (if status = created)
- "Cancel" button (if status = created or confirmed)
- "Refund" button (if status = succeeded or partially_refunded)
  - Opens modal with amount input (default: remaining refundable amount)

## Updated Pages

### Overview Page (`/`)

**New cards:**
- Recent Payments — last 5 payment intents with status badges
- 24h Volume — total succeeded payment amount in last 24 hours
- Payment Stats — count by status (succeeded, pending, failed)

### Accounts Page (`/accounts`)

**Virtual account balance** now reflects payment activity. After a payment succeeds, the merchant's available balance increases.

## User Flows

### Create and Process Payment

1. Navigate to Payments page
2. Click "Create Payment"
3. Fill in amount, currency, description
4. Payment appears in list as "Created"
5. Click into payment detail
6. Click "Confirm" → status updates to "Confirmed" then "Processing" then "Succeeded"
7. Ledger entries appear showing fee split
8. Merchant balance updates on Accounts page

### Refund Payment

1. Navigate to succeeded payment detail
2. Click "Refund"
3. Enter amount (or leave blank for full refund)
4. Confirm refund
5. Status updates to "Refunded" or "Partially Refunded"
6. Ledger entries show reversal
7. God check still green on Ledger page
