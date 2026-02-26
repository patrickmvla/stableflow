# Phase 2: API Endpoints

## New Routes

### Create Payment Intent

```
POST /api/v1/payment-intents
Headers: Idempotency-Key: <unique-key>
```

Request:
```json
{
  "amount": "10000",
  "currency": "USD",
  "description": "Order #1234",
  "metadata": { "order_id": "1234" }
}
```

Response `201`:
```json
{
  "object": "payment_intent",
  "id": "pay_01JQXR5...",
  "account_holder_id": "acc_01JQXR5...",
  "status": "created",
  "amount": "10000",
  "currency": "USD",
  "fee_percent": 3,
  "fee_amount": "300",
  "merchant_amount": "9700",
  "refunded_amount": "0",
  "description": "Order #1234",
  "metadata": { "order_id": "1234" },
  "expires_at": "2026-02-24T12:30:00Z",
  "created_at": "2026-02-24T12:00:00Z",
  "updated_at": "2026-02-24T12:00:00Z"
}
```

### Get Payment Intent

```
GET /api/v1/payment-intents/:id
```

Response `200`: Payment intent object.

### Confirm Payment Intent

```
POST /api/v1/payment-intents/:id/confirm
Headers: Idempotency-Key: <unique-key>
```

Request (optional payment method info):
```json
{
  "payment_method": "card_simulated"
}
```

Response `200`: Updated payment intent with status `confirmed`.

### Cancel Payment Intent

```
POST /api/v1/payment-intents/:id/cancel
Headers: Idempotency-Key: <unique-key>
```

Response `200`: Updated payment intent with status `canceled`.

### Refund Payment Intent

```
POST /api/v1/payment-intents/:id/refund
Headers: Idempotency-Key: <unique-key>
```

Request:
```json
{
  "amount": "5000"
}
```

If `amount` is omitted, full refund. If provided, partial refund.

Response `200`: Updated payment intent with status `refunded` or `partially_refunded`.

Validation:
- Can only refund from `succeeded` or `partially_refunded`
- `refund_amount <= (amount - refunded_amount)`
- Proportional fee reversal

### List Payment Intents

```
GET /api/v1/payment-intents?status=succeeded&limit=20&cursor=pay_01...
```

Query params:
- `status` — filter by status (optional)
- `limit` — page size (default 20, max 100)
- `cursor` — cursor for pagination

Response `200`:
```json
{
  "object": "list",
  "data": [{ "object": "payment_intent", ... }],
  "pagination": { "next_cursor": "pay_01...", "has_more": true }
}
```

### Get Payment Ledger Entries

```
GET /api/v1/payment-intents/:id/ledger
```

Response `200`:
```json
{
  "object": "list",
  "data": [
    {
      "object": "ledger_transaction",
      "id": "txn_01JQXR5...",
      "description": "Payment pay_01... succeeded",
      "reference_type": "payment",
      "reference_id": "pay_01JQXR5...",
      "entries": [
        {
          "id": "ent_01JQXR5...",
          "account_id": "platform:cash:USD",
          "direction": "DEBIT",
          "amount": "10000",
          "currency": "USD"
        },
        {
          "id": "ent_01JQXR5...",
          "account_id": "merchant:acc_01...:available:USD",
          "direction": "CREDIT",
          "amount": "9700",
          "currency": "USD"
        },
        {
          "id": "ent_01JQXR5...",
          "account_id": "platform:fees:USD",
          "direction": "CREDIT",
          "amount": "300",
          "currency": "USD"
        }
      ],
      "created_at": "2026-02-24T12:00:00Z"
    }
  ]
}
```

## Error Responses

```json
// 404 - Payment not found
{
  "error": {
    "type": "payment_not_found",
    "message": "Payment intent pay_01JQXR5... not found"
  }
}

// 409 - Invalid state transition
{
  "error": {
    "type": "invalid_state_transition",
    "message": "Cannot transition from 'canceled' to 'confirmed'",
    "details": {
      "current_status": "canceled",
      "requested_status": "confirmed",
      "allowed_transitions": []
    }
  }
}

// 409 - Idempotency conflict
{
  "error": {
    "type": "idempotency_conflict",
    "message": "Idempotency key already used with different parameters"
  }
}

// 422 - Invalid refund amount
{
  "error": {
    "type": "invalid_amount",
    "message": "Refund amount exceeds available balance",
    "details": {
      "requested": "15000",
      "available": "10000"
    }
  }
}
```
