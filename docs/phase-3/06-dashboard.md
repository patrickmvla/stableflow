# Phase 3: Dashboard Updates

## New Pages

### Settlements Page (`/settlements`)

List settlements with real-time status updates.

**Settlements Table:**
| ID | Payment | Network | Amount | Status | Confirmations | Created |
|----|---------|---------|--------|--------|---------------|---------|
| stl_01... | pay_01... | Polygon | 97.00 USDC | Confirming | 15/30 | Feb 24 |
| stl_01... | pay_01... | Base | 48.50 USDC | Settled | 20/20 | Feb 24 |

**Network Badges:**
- Ethereum — blue
- Polygon — purple
- Base — blue (lighter)
- Arbitrum — blue-cyan
- Solana — green/gradient

**Status Badges:**
- `pending` — gray
- `submitting` — yellow
- `submitted` — amber
- `confirming` — blue (animated pulse)
- `confirmed` — green (lighter)
- `settled` — green (solid)
- `failed` — red
- `retrying` — orange
- `abandoned` — dark red

**Filters:**
- Status dropdown
- Network dropdown
- Pagination

**Live Updates:**
- Table rows update in real-time via SSE
- Confirmation counts animate up
- Status badges transition with animation

### Settlement Detail Page (`/settlements/:id`)

**Header:**
```
Settlement stl_01JQXR5...
Network: [Polygon Badge]  Status: [Confirming ●]
```

**Confirmation Progress Bar:**
```
Confirmations: 15 of 30
[██████████████████░░░░░░░░░░░░░░] 50%
```

- Animated fill
- Updates in real-time via SSE
- Shows percentage and count

**Network Selection Reasoning:**
```
┌──────────────────────────────────────────────────┐
│ Why Polygon?                                      │
│                                                    │
│ Selected Polygon (score: 0.87)                    │
│ • 80% cheaper than Ethereum ($0.02 vs $0.10 gas) │
│ • 58% faster finality (60s vs 144s)              │
│ • 97% reliability                                 │
│                                                    │
│ Network Comparison:                               │
│ ┌──────────┬───────┬───────┬────────┬──────────┐ │
│ │ Network  │ Cost  │ Speed │ Reliab │ Score    │ │
│ ├──────────┼───────┼───────┼────────┼──────────┤ │
│ │ Polygon  │ 0.95  │ 0.78  │ 0.97   │ 0.87 ★  │ │
│ │ Base     │ 0.97  │ 0.82  │ 0.98   │ 0.85    │ │
│ │ Arbitrum │ 0.95  │ 0.95  │ 0.98   │ 0.84    │ │
│ │ Solana   │ 0.99  │ 0.93  │ 0.95   │ 0.82    │ │
│ │ Ethereum │ 0.10  │ 0.20  │ 0.99   │ 0.40    │ │
│ └──────────┴───────┴───────┴────────┴──────────┘ │
└──────────────────────────────────────────────────┘
```

**Gas Cost Breakdown:**
| Field | Value |
|-------|-------|
| Estimated Gas | $0.02 |
| Actual Gas | $0.018 (after settlement) |
| Network | Polygon |
| Tx Hash | 0xabc123... |

**Event Timeline:**

Vertical timeline of all settlement events:

```
● Settlement Created (12:00:30)
│  Network: Polygon, Amount: 97.00 USDC
│
● Network Selected (12:00:30)
│  Score: 0.87, Reason: 80% cheaper than Ethereum...
│
● Status → Submitting (12:00:31)
│
● Status → Submitted (12:00:32)
│  Tx Hash: 0xabc123...
│
● Status → Confirming (12:00:34)
│
● Confirmation: 5/30 (12:00:44)
│
● Confirmation: 10/30 (12:00:54)
│
● Confirmation: 15/30 (12:01:04)   ← Current
│
○ Confirmation: 30/30 (pending)
│
○ Confirmed (pending)
│
○ Settled (pending)
```

Past events: filled circles (●), future events: hollow circles (○).
Real-time: new events appear with animation.

**Details Card:**
| Field | Value |
|-------|-------|
| Payment | pay_01JQXR5... (link) |
| Source | $97.00 USD |
| Target | 97.000000 USDC |
| Retries | 0/3 |
| Created | Feb 24, 2026, 12:00 PM |

**Actions:**
- "Retry" button (if status = failed)

## Updated Pages

### Overview Page (`/`)

**New section: Settlement Pipeline**

Visual pipeline showing count of settlements in each state:

```
Pending → Submitting → Submitted → Confirming → Confirmed → Settled
  [2]       [1]          [0]         [3]          [1]        [15]
```

Each box is color-coded and clickable (filters settlements page).

**Updated cards:**
- Total Settled — sum of settled amounts
- Active Settlements — count currently in pipeline

### Payments Page (`/payments`)

Payment detail now shows linked settlement:
```
Settlement: stl_01JQXR5... [Confirming - 15/30] → (link to settlement detail)
```

## SSE Integration

### Connection Setup

```typescript
// packages/web/src/hooks/useEventStream.ts
function useEventStream() {
  const [events, setEvents] = useState<DomainEvent[]>([]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/v1/events/stream`);

    es.addEventListener("settlement.status_changed", (e) => {
      const data = JSON.parse(e.data);
      // Update settlement in local state
    });

    es.addEventListener("settlement.confirmation_progress", (e) => {
      const data = JSON.parse(e.data);
      // Update progress bar
    });

    es.onerror = () => {
      // Reconnect with backoff
    };

    return () => es.close();
  }, []);

  return events;
}
```

### Real-Time Updates

- Settlement list: rows update status/confirmations live
- Settlement detail: progress bar animates, timeline grows
- Overview: pipeline counts update
- Payment detail: linked settlement status updates
