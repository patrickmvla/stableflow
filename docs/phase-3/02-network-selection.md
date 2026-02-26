# Phase 3: Network Selection

## Algorithm

Composite scoring across 3 dimensions to select the optimal blockchain network.

## Network Configurations

```typescript
interface NetworkConfig {
  name: string;
  displayName: string;
  currency: Currency;           // "USDC" or "USDT"
  avgBlockTime: number;         // seconds
  confirmationsRequired: number;
  baseFeeGwei: number;          // Average base fee
  feeVolatility: number;        // 0-1, how much gas fluctuates
  reliability: number;          // 0-1, historical success rate
  avgFinality: number;          // seconds to finality
  active: boolean;
}

const NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    name: "ethereum",
    displayName: "Ethereum",
    currency: "USDC",
    avgBlockTime: 12,
    confirmationsRequired: 12,
    baseFeeGwei: 30,
    feeVolatility: 0.4,
    reliability: 0.99,
    avgFinality: 144,           // 12 blocks * 12s
    active: true,
  },
  polygon: {
    name: "polygon",
    displayName: "Polygon",
    currency: "USDC",
    avgBlockTime: 2,
    confirmationsRequired: 30,
    baseFeeGwei: 0.1,
    feeVolatility: 0.2,
    reliability: 0.97,
    avgFinality: 60,            // 30 blocks * 2s
    active: true,
  },
  base: {
    name: "base",
    displayName: "Base",
    currency: "USDC",
    avgBlockTime: 2,
    confirmationsRequired: 20,
    baseFeeGwei: 0.05,
    feeVolatility: 0.15,
    reliability: 0.98,
    avgFinality: 40,
    active: true,
  },
  arbitrum: {
    name: "arbitrum",
    displayName: "Arbitrum",
    currency: "USDC",
    avgBlockTime: 0.25,
    confirmationsRequired: 45,
    baseFeeGwei: 0.1,
    feeVolatility: 0.1,
    reliability: 0.98,
    avgFinality: 11,
    active: true,
  },
  solana: {
    name: "solana",
    displayName: "Solana",
    currency: "USDC",
    avgBlockTime: 0.4,
    confirmationsRequired: 32,
    baseFeeGwei: 0.001,         // Not gwei, but normalized equivalent
    feeVolatility: 0.05,
    reliability: 0.95,
    avgFinality: 13,
    active: true,
  },
};
```

## Scoring Algorithm

```typescript
interface NetworkScore {
  network: string;
  costScore: number;       // 0-1, lower cost = higher score
  speedScore: number;      // 0-1, faster finality = higher score
  reliabilityScore: number; // 0-1, higher reliability = higher score
  compositeScore: number;  // Weighted combination
  reasoning: string;       // Human-readable explanation
}

const WEIGHTS = {
  cost: 0.4,        // 40%
  speed: 0.3,       // 30%
  reliability: 0.3, // 30%
};
```

### Cost Score

```typescript
function computeCostScore(network: NetworkConfig, currentGas: number): number {
  // Normalize: cheapest network gets 1.0, most expensive gets near 0
  const estimatedFee = currentGas * network.baseFeeGwei;
  // Invert and normalize relative to max across all networks
  return 1 - (estimatedFee / maxFeeAcrossNetworks);
}
```

### Speed Score

```typescript
function computeSpeedScore(network: NetworkConfig): number {
  // Normalize: fastest finality gets 1.0
  return 1 - (network.avgFinality / maxFinalityAcrossNetworks);
}
```

### Reliability Score

```typescript
function computeReliabilityScore(network: NetworkConfig): number {
  // Direct mapping: reliability is already 0-1
  return network.reliability;
}
```

### Composite Score

```typescript
function computeCompositeScore(cost: number, speed: number, reliability: number): number {
  return (cost * WEIGHTS.cost) + (speed * WEIGHTS.speed) + (reliability * WEIGHTS.reliability);
}
```

### Selection

```typescript
interface NetworkSelectionResult {
  network: string;
  score: number;
  scores: NetworkScore[];      // All networks ranked
  reasoning: string;           // Human explanation
  gasEstimate: bigint;
}

function selectNetwork(options: {
  amount: bigint;
  targetCurrency: Currency;
  availableNetworks?: string[];
}): NetworkSelectionResult;
```

### Reasoning Generation

Human-readable explanation of why a network was chosen:

```
"Selected Polygon (score: 0.87). 80% cheaper than Ethereum ($0.02 vs $0.10 gas),
58% faster finality (60s vs 144s), with 97% reliability.
Runner-up: Base (score: 0.85)."
```

Format:
```typescript
function generateReasoning(winner: NetworkScore, runnerUp: NetworkScore): string {
  const costDiff = ((1 - winner.costScore / runnerUp.costScore) * 100).toFixed(0);
  const speedDiff = ((1 - winner.speedScore / runnerUp.speedScore) * 100).toFixed(0);
  return `Selected ${winner.network} (score: ${winner.compositeScore.toFixed(2)}). ` +
    `${costDiff}% cheaper than ${runnerUp.network}, ` +
    `${speedDiff}% faster finality, ` +
    `with ${(winner.reliabilityScore * 100).toFixed(0)}% reliability.`;
}
```

## Gas Fee Simulation

```typescript
interface GasEstimate {
  baseFee: bigint;       // Base fee in smallest unit
  priorityFee: bigint;   // Priority/tip fee
  totalFee: bigint;      // baseFee + priorityFee
  feeUSD: bigint;        // Fee in USD cents (for display)
}

function estimateGas(network: string, options?: {
  volatilityMultiplier?: number;
}): GasEstimate;
```

Gas simulation adds randomness based on network's `feeVolatility`:
- Deterministic mode (tests): fixed fee = baseFeeGwei
- Realistic mode (demo): fee = baseFeeGwei * (1 + random * volatility)

## API

```
GET /api/v1/networks
```

Returns all networks with current gas estimates:
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
      "current_gas_estimate": {
        "base_fee": "100000",
        "total_fee": "120000",
        "fee_usd": "2"
      },
      "reliability": 0.97,
      "active": true
    }
  ]
}
```

## Determinism

**INV-S3:** Given the same inputs, network selection always produces the same result. The scoring algorithm is a pure function. Gas estimation in test mode uses fixed values.
