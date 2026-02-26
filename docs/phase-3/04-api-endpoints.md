# Phase 3: API Endpoints

## New Routes

### Get Settlement

```
GET /api/v1/settlements/:id
```

Response `200`:
```json
{
  "object": "settlement",
  "id": "stl_01JQXR5...",
  "payment_intent_id": "pay_01JQXR5...",
  "account_holder_id": "acc_01JQXR5...",
  "source_currency": "USD",
  "source_amount": "9700",
  "target_currency": "USDC",
  "target_amount": "9700000000",
  "network": "polygon",
  "network_selection_reason": "Selected Polygon (score: 0.87). 80% cheaper than Ethereum...",
  "status": "confirming",
  "tx_hash": "0xabc123...",
  "gas_estimate": "120000",
  "gas_actual": null,
  "confirmations": 15,
  "confirmations_required": 30,
  "retry_count": 0,
  "max_retries": 3,
  "error": null,
  "submitted_at": "2026-02-24T12:01:00Z",
  "confirmed_at": null,
  "settled_at": null,
  "created_at": "2026-02-24T12:00:30Z",
  "updated_at": "2026-02-24T12:01:15Z"
}
```

### Get Settlement Events

```
GET /api/v1/settlements/:id/events
```

Response `200`:
```json
{
  "object": "list",
  "data": [
    {
      "object": "domain_event",
      "id": "evt_01JQXR5...",
      "event_type": "settlement.created",
      "payload": { "network": "polygon", "amount": "9700" },
      "created_at": "2026-02-24T12:00:30Z"
    },
    {
      "object": "domain_event",
      "id": "evt_01JQXR5...",
      "event_type": "settlement.network_selected",
      "payload": { "network": "polygon", "score": 0.87, "reasoning": "..." },
      "created_at": "2026-02-24T12:00:30Z"
    },
    {
      "object": "domain_event",
      "id": "evt_01JQXR5...",
      "event_type": "settlement.status_changed",
      "payload": { "from_status": "pending", "to_status": "submitting" },
      "created_at": "2026-02-24T12:00:31Z"
    },
    {
      "object": "domain_event",
      "id": "evt_01JQXR5...",
      "event_type": "settlement.confirmation_progress",
      "payload": { "confirmations": 15, "required": 30 },
      "created_at": "2026-02-24T12:01:15Z"
    }
  ]
}
```

### List Settlements

```
GET /api/v1/settlements?status=confirming&network=polygon&limit=20&cursor=stl_01...
```

Query params:
- `status` — filter by status
- `network` — filter by network
- `limit` — page size (default 20)
- `cursor` — cursor for pagination

Response `200`:
```json
{
  "object": "list",
  "data": [{ "object": "settlement", ... }],
  "pagination": { "next_cursor": "stl_01...", "has_more": true }
}
```

### Retry Failed Settlement

```
POST /api/v1/settlements/:id/retry
Headers: Idempotency-Key: <unique-key>
```

Transitions a `failed` settlement to `retrying` → `submitting`.

Response `200`: Updated settlement object.

Error `409` if not in `failed` state.

### List Networks

```
GET /api/v1/networks
```

No auth required (public info).

Response `200`:
```json
{
  "object": "list",
  "data": [
    {
      "object": "network",
      "name": "polygon",
      "display_name": "Polygon",
      "currency": "USDC",
      "avg_block_time": 2,
      "confirmations_required": 30,
      "reliability": 0.97,
      "current_gas": {
        "base_fee": "100000",
        "priority_fee": "20000",
        "total_fee": "120000",
        "fee_usd": "2"
      },
      "active": true
    },
    {
      "object": "network",
      "name": "ethereum",
      "display_name": "Ethereum",
      "currency": "USDC",
      "avg_block_time": 12,
      "confirmations_required": 12,
      "reliability": 0.99,
      "current_gas": {
        "base_fee": "30000000000",
        "priority_fee": "2000000000",
        "total_fee": "32000000000",
        "fee_usd": "10"
      },
      "active": true
    }
  ]
}
```

### SSE Event Stream

```
GET /api/v1/events/stream
```

Server-Sent Events endpoint. Streams real-time updates.

Response: `text/event-stream`

```
event: settlement.status_changed
id: evt_01JQXR5...
data: {"settlement_id":"stl_01JQXR5...","from_status":"submitted","to_status":"confirming","network":"polygon"}

event: settlement.confirmation_progress
id: evt_01JQXR5...
data: {"settlement_id":"stl_01JQXR5...","confirmations":20,"required":30,"network":"polygon"}

event: heartbeat
data:

event: settlement.status_changed
id: evt_01JQXR5...
data: {"settlement_id":"stl_01JQXR5...","from_status":"confirming","to_status":"confirmed","network":"polygon"}
```

Client connects with:
```javascript
const es = new EventSource("/api/v1/events/stream");
es.addEventListener("settlement.status_changed", handler);
es.addEventListener("settlement.confirmation_progress", handler);
```

## Error Responses

```json
// 404 - Settlement not found
{
  "error": {
    "type": "settlement_not_found",
    "message": "Settlement stl_01JQXR5... not found"
  }
}

// 409 - Cannot retry (not failed)
{
  "error": {
    "type": "invalid_state_transition",
    "message": "Cannot retry settlement in 'confirming' state",
    "details": {
      "current_status": "confirming",
      "required_status": "failed"
    }
  }
}
```
