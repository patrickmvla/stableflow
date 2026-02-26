# Phase 3: Settlement Pipeline

## Package: `packages/settlement/`

The showpiece. Converts merchant fiat balances to stablecoins on blockchain networks with real-time progress tracking.

## Settlement State Machine

```
pending → submitting → submitted → confirming → confirmed → settled
                                       ↓
                                     failed → retrying → submitting (loop back)
                                       ↓
                                   abandoned
```

### States

| State | Description |
|-------|-------------|
| `pending` | Settlement created, awaiting network selection |
| `submitting` | Transaction being submitted to blockchain |
| `submitted` | Transaction broadcast, waiting for inclusion |
| `confirming` | Included in block, accumulating confirmations |
| `confirmed` | Required confirmations reached |
| `settled` | Final state — funds credited to stablecoin account |
| `failed` | Transaction failed (gas, network error, etc.) |
| `retrying` | Retry scheduled with exponential backoff |
| `abandoned` | Max retries exceeded, manual intervention needed |

### Valid Transitions

```typescript
const SETTLEMENT_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  pending: ["submitting"],
  submitting: ["submitted", "failed"],
  submitted: ["confirming", "failed"],
  confirming: ["confirmed", "failed"],
  confirmed: ["settled"],
  settled: [],
  failed: ["retrying", "abandoned"],
  retrying: ["submitting"],
  abandoned: [],
};
```

## Settlement Model

```typescript
interface Settlement {
  id: string;                    // "stl_01JQXR..."
  paymentIntentId: string;       // Source payment
  accountHolderId: string;       // Owner merchant
  sourceCurrency: Currency;      // "USD"
  sourceAmount: bigint;          // Amount in fiat (merchant_amount from payment)
  targetCurrency: Currency;      // "USDC"
  targetAmount: bigint;          // Amount in stablecoin (after decimal conversion)
  network: string;               // "polygon", "ethereum", etc.
  networkSelectionReason: string; // Human-readable explanation
  status: SettlementStatus;
  txHash?: string;               // Blockchain transaction hash (simulated)
  gasEstimate: bigint;           // Estimated gas in wei
  gasActual?: bigint;            // Actual gas used
  confirmations: number;         // Current confirmations
  confirmationsRequired: number; // Target confirmations for this network
  retryCount: number;
  maxRetries: number;            // Default: 3
  error?: string;                // Last error message
  events: SettlementEvent[];     // Full event history
  submittedAt?: Date;
  confirmedAt?: Date;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Settlement Flow

### 1. Trigger

After a payment succeeds, a settlement is automatically created:
```typescript
// In payment processing:
if (newStatus === "succeeded") {
  await createSettlement(tx, {
    paymentIntentId: payment.id,
    accountHolderId: payment.accountHolderId,
    sourceCurrency: payment.currency,
    sourceAmount: payment.merchantAmount,
    targetCurrency: "USDC", // Default target
  });
}
```

### 2. Network Selection

The system selects the optimal blockchain network:
```typescript
const selection = selectNetwork({
  amount: settlement.sourceAmount,
  targetCurrency: "USDC",
  availableNetworks: getActiveNetworks(),
});
// Returns: { network: "polygon", reason: "...", score: 0.87 }
```

See `02-network-selection.md` for the scoring algorithm.

### 3. Gas Estimation

```typescript
const gasEstimate = estimateGas(network, {
  amount: settlement.targetAmount,
  volatilityFactor: getNetworkVolatility(network),
});
```

### 4. Blockchain Simulation

The blockchain simulator processes the settlement:

```typescript
const simulator = createBlockchainSimulator({
  mode: "realistic",  // or "deterministic" for tests
  speedMultiplier: 1, // 1x = real-time, 5x = fast, 20x = demo speed
});

// Submit transaction
const result = await simulator.submitTransaction({
  network,
  amount: settlement.targetAmount,
  gasEstimate,
});

// Poll for confirmations
const status = await simulator.getTransactionStatus(result.txHash);
// Returns: { confirmations: 15, required: 30, status: "confirming" }
```

### 5. Confirmation Tracking

The settlement processor polls for confirmations:

```typescript
async function processConfirmations(settlement: Settlement): Promise<void> {
  const status = await simulator.getTransactionStatus(settlement.txHash);

  // Record every confirmation milestone
  if (status.confirmations > settlement.confirmations) {
    await updateConfirmations(db, settlement.id, status.confirmations);
    await recordEvent(db, settlement.id, "confirmation_progress", {
      confirmations: status.confirmations,
      required: settlement.confirmationsRequired,
    });
  }

  if (status.confirmations >= settlement.confirmationsRequired) {
    await transitionTo(db, settlement.id, "confirmed");
  }
}
```

### 6. Settlement Completion

When confirmed, the final ledger entries are posted:

```typescript
// Debit merchant fiat, credit merchant stablecoin
await postTransaction(tx, {
  description: `Settlement ${settlement.id} completed`,
  referenceType: "settlement",
  referenceId: settlement.id,
  entries: [
    // Debit merchant's fiat available balance
    { accountId: `merchant:${accId}:available:${sourceCurrency}`, direction: "DEBIT", amount: sourceAmount, currency: sourceCurrency },
    // Credit merchant's stablecoin balance
    { accountId: `merchant:${accId}:available:${targetCurrency}`, direction: "CREDIT", amount: targetAmount, currency: targetCurrency },
  ],
});

// Gas fee entry (separate transaction, single-currency)
await postTransaction(tx, {
  description: `Gas fee for settlement ${settlement.id}`,
  referenceType: "settlement_gas",
  referenceId: settlement.id,
  entries: [
    { accountId: `platform:gas:${targetCurrency}`, direction: "DEBIT", amount: gasActual, currency: targetCurrency },
    { accountId: `platform:cash:${targetCurrency}`, direction: "CREDIT", amount: gasActual, currency: targetCurrency },
  ],
});
```

**Note on cross-currency:** The fiat debit and stablecoin credit are in different currencies. The god check verifies per-currency, so each currency must independently balance. The "bridge" is the settlement itself — the platform absorbs the cross-currency conversion.

## Retry Logic

On failure:
1. Increment `retryCount`
2. If `retryCount < maxRetries`: transition to `retrying`
3. Wait with exponential backoff: `baseDelay * 2^retryCount` (1s, 2s, 4s)
4. Transition back to `submitting` with new gas estimate
5. If `retryCount >= maxRetries`: transition to `abandoned`

## Settlement Event Log

Every state transition creates an immutable event:

```typescript
interface SettlementEvent {
  id: string;         // "evt_01JQXR..."
  settlementId: string;
  eventType: string;  // "status_changed", "confirmation_progress", "gas_estimated", "network_selected"
  fromStatus?: string;
  toStatus?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}
```

Events enable:
- Full audit trail
- Witness reconstruction (rebuild state from events)
- Real-time SSE broadcasting
- Timeline visualization in dashboard
