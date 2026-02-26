# Phase 2: Payment Intents

## Package: `packages/payments/`

Payment intents represent a customer's intention to pay. They progress through a state machine, with ledger entries posted at each financial transition.

## State Machine

```
created → confirmed → processing → succeeded
  ↓          ↓                        ↓
canceled   canceled                 refunded
  ↓                                   ↑
expired                         partially_refunded → refunded
```

### States

| State | Description |
|-------|-------------|
| `created` | Payment intent created, awaiting confirmation |
| `confirmed` | Customer confirmed payment method, funds held |
| `processing` | Payment being processed (fee split, ledger posting) |
| `succeeded` | Payment complete, merchant credited |
| `canceled` | Canceled by merchant or customer |
| `expired` | Timed out (30 min from creation) |
| `refunded` | Fully refunded |
| `partially_refunded` | Partially refunded |

### Valid Transitions

```typescript
const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  created: ["confirmed", "canceled", "expired"],
  confirmed: ["processing", "canceled"],
  processing: ["succeeded"],
  succeeded: ["refunded", "partially_refunded"],
  canceled: [],
  expired: [],
  refunded: [],
  partially_refunded: ["refunded", "partially_refunded"],
};
```

## Payment Intent Model

```typescript
interface PaymentIntent {
  id: string;                    // "pay_01JQXR..."
  accountHolderId: string;       // Owner merchant
  status: PaymentStatus;
  amount: bigint;                // Total amount in minor units
  currency: Currency;
  feePercent: number;            // Default: 3
  feeAmount: bigint;             // Computed: calculateFee(amount, feePercent)
  merchantAmount: bigint;        // amount - feeAmount
  refundedAmount: bigint;        // Cumulative refunded
  description?: string;
  metadata: Record<string, unknown>;
  idempotencyKey?: string;
  expiresAt: Date;               // 30 min from creation
  createdAt: Date;
  updatedAt: Date;
}
```

## Ledger Entries Per Transition

### `created → confirmed` (Hold funds)

```
DEBIT   merchant:{acc_id}:holds:{currency}      amount
CREDIT  merchant:{acc_id}:available:{currency}   amount
```

Interpretation: Move funds from available to held.

### `confirmed → processing → succeeded` (Capture with fee split)

```
// Release hold:
DEBIT   merchant:{acc_id}:available:{currency}   amount
CREDIT  merchant:{acc_id}:holds:{currency}       amount

// Credit merchant (minus fee):
DEBIT   merchant:{acc_id}:available:{currency}   merchantAmount
CREDIT  platform:cash:{currency}                 merchantAmount

// Platform fee (if > 0):
DEBIT   merchant:{acc_id}:available:{currency}   feeAmount
CREDIT  platform:fees:{currency}                 feeAmount
```

Wait — the above doesn't make sense for a payment platform. Let me reconsider.

**Correct flow for payment processing:**

When a customer pays, money flows INTO the platform. The platform owes the merchant their share.

### `created → confirmed` (Hold customer payment)

```
DEBIT   customer:holds:{currency}                amount
CREDIT  customer:funds:{currency}                amount
```

Actually, for simplicity (no customer accounts in StableFlow — merchants are the accounts):

**Simplified model:** When a payment succeeds, the platform receives money and owes the merchant.

### `processing → succeeded` (Payment captured)

```
DEBIT   platform:cash:{currency}                 amount      (platform received money)
CREDIT  merchant:{acc_id}:available:{currency}   merchantAmount  (owed to merchant)
CREDIT  platform:fees:{currency}                 feeAmount   (fee earned)
```

**Invariant:** merchantAmount + feeAmount === amount

### `succeeded → refunded` (Full refund)

```
DEBIT   merchant:{acc_id}:available:{currency}   merchantAmount  (take back from merchant)
DEBIT   platform:fees:{currency}                 feeAmount       (reverse fee)
CREDIT  platform:cash:{currency}                 amount          (money leaves platform)
```

### `succeeded → partially_refunded` (Partial refund)

```
// Proportional split of refund
refundFee = calculateFee(refundAmount, feePercent)
refundMerchant = refundAmount - refundFee

DEBIT   merchant:{acc_id}:available:{currency}   refundMerchant
DEBIT   platform:fees:{currency}                 refundFee
CREDIT  platform:cash:{currency}                 refundAmount
```

### `created/confirmed → canceled` (Cancellation)

If confirmed (funds held):
```
DEBIT   customer:funds:{currency}    amount     (reverse hold)
CREDIT  customer:holds:{currency}    amount
```

If only created: no ledger entries needed.

## Fee Calculation

```typescript
const DEFAULT_FEE_PERCENT = 3; // 3%

// At payment creation:
feeAmount = calculateFee(amount, feePercent);    // amount * feePercent / 100
merchantAmount = amount - feeAmount;

// Invariant: merchantAmount + feeAmount === amount (always, due to BigInt)
```

Edge cases:
- Small amounts where fee rounds to 0: fee = 0, merchant gets full amount
- Minimum amount: 1 (1 cent for USD)

## Idempotency

### Double-Check Pattern

```typescript
async function createPaymentIntent(db, input, idempotencyKey): Promise<PaymentIntent> {
  // 1. Pre-check: look up idempotency key
  const existing = await getIdempotencyKey(db, idempotencyKey);
  if (existing) return existing.response;

  // 2. Inside transaction:
  return db.transaction(async (tx) => {
    // Re-check inside transaction (race condition protection)
    const existingInTx = await getIdempotencyKey(tx, idempotencyKey);
    if (existingInTx) return existingInTx.response;

    // Create payment intent
    const payment = await insertPaymentIntent(tx, input);

    // Store idempotency key (24h TTL)
    await storeIdempotencyKey(tx, {
      key: idempotencyKey,
      resourceType: "payment_intent",
      resourceId: payment.id,
      response: payment,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return payment;
  });
}
```

### Idempotency Key Rules
- Provided via `Idempotency-Key` header
- Required for all mutation endpoints
- Same key + same params = same response (cached)
- Same key + different params = 409 Conflict
- Keys expire after 24 hours

## Concurrency Control

### Pessimistic Locking

All state transitions use `SELECT ... FOR UPDATE`:

```typescript
async function confirmPayment(db, paymentId): Promise<PaymentIntent> {
  return db.transaction(async (tx) => {
    // Lock the payment row
    const [payment] = await tx
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, paymentId))
      .for("update");

    if (!payment) throw new PaymentNotFoundError(paymentId);

    // Check expiry
    if (payment.expiresAt && payment.expiresAt < new Date()) {
      // Expire on access
      await updateStatus(tx, paymentId, "expired");
      throw new InvalidStateTransitionError("created", "confirmed", "Payment expired");
    }

    // Validate transition
    validateTransition(payment.status, "confirmed");

    // Post ledger entries
    await postTransaction(tx, { ... });

    // Update status
    return updateStatus(tx, paymentId, "confirmed");
  });
}
```

## Expiry

- Payment intents expire 30 minutes after creation
- Checked on-access (lazy expiry), not via background job
- When accessed after expiry: status updated to `expired`, holds reversed if confirmed
