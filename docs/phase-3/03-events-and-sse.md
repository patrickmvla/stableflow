# Phase 3: Events & SSE

## Package: `packages/events/`

Transactional outbox pattern for reliable event delivery + Server-Sent Events for real-time dashboard updates.

## Transactional Outbox Pattern

Events are written to the database in the same transaction as the state change. A separate process reads unpublished events and broadcasts them via SSE.

### Why Outbox?

Without outbox:
```
1. Update settlement status  → DB commit ✓
2. Publish SSE event         → Network fail ✗
Result: State changed but client never notified
```

With outbox:
```
1. Update settlement status + INSERT event → DB commit ✓ (atomic)
2. Poll for unpublished events → Read event
3. Broadcast SSE → Client notified ✓
4. Mark event published → DB commit ✓
```

If step 3 fails, the event stays unpublished and is retried on next poll.

## Domain Events Table

```typescript
interface DomainEvent {
  id: string;              // "evt_01JQXR..."
  aggregateType: string;   // "settlement", "payment", "account"
  aggregateId: string;     // The entity ID
  eventType: string;       // "settlement.status_changed", "settlement.confirmation_progress"
  payload: Record<string, unknown>;
  publishedAt?: Date;      // NULL until SSE broadcast
  createdAt: Date;
}
```

### Event Types

```typescript
const EVENT_TYPES = {
  // Settlement events
  "settlement.created": { settlementId, network, amount },
  "settlement.status_changed": { settlementId, fromStatus, toStatus, network },
  "settlement.confirmation_progress": { settlementId, confirmations, required, network },
  "settlement.network_selected": { settlementId, network, score, reasoning },
  "settlement.gas_estimated": { settlementId, network, gasEstimate },
  "settlement.settled": { settlementId, network, txHash, gasActual },
  "settlement.failed": { settlementId, network, error },

  // Payment events (Phase 2 retroactive)
  "payment.created": { paymentId, amount, currency },
  "payment.status_changed": { paymentId, fromStatus, toStatus },
  "payment.refunded": { paymentId, refundAmount },
} as const;
```

## Event Writer

```typescript
// Write event inside the same transaction as the state change
async function recordEvent(
  tx: Database,  // Transaction handle
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<string>;

// Usage:
await db.transaction(async (tx) => {
  // Update settlement status
  await updateSettlementStatus(tx, settlementId, "confirmed");

  // Record event in same transaction
  await recordEvent(tx, "settlement", settlementId, "settlement.status_changed", {
    fromStatus: "confirming",
    toStatus: "confirmed",
    confirmations: 30,
    network: "polygon",
  });
});
```

## Event Publisher (Polling)

```typescript
interface EventPublisher {
  start(): void;
  stop(): void;
  onEvent(handler: (event: DomainEvent) => void): void;
}

function createEventPublisher(db: Database, options?: {
  pollIntervalMs?: number;  // Default: 500ms
  batchSize?: number;       // Default: 100
}): EventPublisher;
```

**Poll loop:**
1. Query: `SELECT * FROM domain_events WHERE published_at IS NULL ORDER BY created_at LIMIT 100`
2. For each event: broadcast to SSE subscribers
3. Mark as published: `UPDATE domain_events SET published_at = NOW() WHERE id IN (...)`
4. Sleep for pollIntervalMs
5. Repeat

## SSE Broadcaster

```typescript
interface SSEBroadcaster {
  addClient(clientId: string, stream: WritableStream): void;
  removeClient(clientId: string): void;
  broadcast(event: DomainEvent): void;
  getClientCount(): number;
}

function createSSEBroadcaster(): SSEBroadcaster;
```

### SSE Message Format

```
event: settlement.status_changed
id: evt_01JQXR5...
data: {"settlement_id":"stl_01JQXR5...","from_status":"confirming","to_status":"confirmed","network":"polygon","confirmations":30}

event: settlement.confirmation_progress
id: evt_01JQXR5...
data: {"settlement_id":"stl_01JQXR5...","confirmations":15,"required":30,"network":"polygon"}
```

### SSE Endpoint

```
GET /api/v1/events/stream
```

Hono route:
```typescript
app.get("/api/v1/events/stream", (c) => {
  return c.streamSSE(async (stream) => {
    const clientId = generateId("sse");
    broadcaster.addClient(clientId, stream);

    // Send heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      stream.writeSSE({ event: "heartbeat", data: "" });
    }, 30000);

    // Clean up on disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      broadcaster.removeClient(clientId);
    });
  });
});
```

### Client-Side (Dashboard)

```typescript
const eventSource = new EventSource("/api/v1/events/stream", {
  headers: { Authorization: `Bearer ${apiKey}` },
});

eventSource.addEventListener("settlement.status_changed", (e) => {
  const data = JSON.parse(e.data);
  updateSettlementInUI(data.settlement_id, data.to_status);
});

eventSource.addEventListener("settlement.confirmation_progress", (e) => {
  const data = JSON.parse(e.data);
  updateProgressBar(data.settlement_id, data.confirmations, data.required);
});
```

## Event Completeness (INV-S5)

Every settlement state transition MUST produce a domain event. This is enforced by:
1. Recording the event in the same transaction as the state change
2. Witness reconstruction test: rebuild full settlement state from events alone
3. Verify event count matches expected transitions

## Cleanup

Old published events can be cleaned up periodically:
```sql
DELETE FROM domain_events WHERE published_at IS NOT NULL AND created_at < NOW() - INTERVAL '7 days';
```
