# Phase 1: Dashboard

## Package: `packages/web/`

Next.js 16 + Tailwind CSS + shadcn/ui dashboard.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **Data Fetching:** Server components + `fetch()` to API
- **State:** React hooks (no external state library for Phase 1)

## Layout

```
┌─────────────────────────────────────────────────┐
│  StableFlow              [API Key: sf_live_...] │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Overview │  Main Content Area                   │
│ Accounts │                                      │
│ Ledger   │                                      │
│ API Keys │                                      │
│          │                                      │
│          │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

Left sidebar navigation. Header with logo and current API key indicator.

## Pages

### Overview (`/`)

The landing page. Shows a summary of the system state.

**Cards:**
- Total Accounts — count of account holders
- Total Virtual Accounts — count of virtual accounts
- Balance by Currency — table showing total balance per currency across all merchants

**Later phases add:** Recent payments, 24h volume, settlement pipeline visualization.

### Accounts (`/accounts`)

List and manage account holders and their virtual accounts.

**Account Holders Table:**
| Name | Email | Status | Virtual Accounts | Created |
|------|-------|--------|-----------------|---------|
| Acme Corp | billing@acme.com | Active | 3 | Feb 24, 2026 |

**Actions:**
- "Create Account" button → modal with name + email fields
- Click row → expand to show virtual accounts

**Virtual Accounts (expanded row):**
| Currency | Type | Network | Balance | Status |
|----------|------|---------|---------|--------|
| USD | Fiat | — | $1,000.00 | Active |
| USDC | Stablecoin | Polygon | 500.000000 USDC | Active |

**Actions:**
- "Add Virtual Account" button → modal with currency + network fields
- Balance displayed in formatted form

### Ledger Explorer (`/ledger`)

Inspect the ledger for debugging and verification.

**Ledger Accounts Table:**
| Account | Type | Currency | Balance |
|---------|------|----------|---------|
| platform:fees:USD | Revenue | USD | $30.00 |
| merchant:acc_01...:available:USD | Liability | USD | $970.00 |

**God Check Widget:**
- Big green checkmark when balanced: "System Balanced"
- Big red X when unbalanced: "SYSTEM IMBALANCED" with details
- "Run God Check" button to refresh
- Shows per-currency breakdown

**Recent Transactions (optional for Phase 1):**
| ID | Description | Reference | Entries | Date |
|----|-------------|-----------|---------|------|
| txn_01... | Authorize payment pay_01... | payment:pay_01... | 2 | Feb 24 |

### API Keys (`/api-keys`)

Manage API keys for the current account.

**API Keys Table:**
| Name | Prefix | Created | Status | Actions |
|------|--------|---------|--------|---------|
| Production Key | sf_live_ | Feb 24, 2026 | Active | [Revoke] |
| Old Key | sf_live_ | Feb 20, 2026 | Revoked | — |

**Create Key Flow:**
1. Click "Create API Key" → modal with name field
2. On creation → show plaintext key in a copyable alert box
3. Warning: "This key will only be shown once. Copy it now."
4. Dismiss → key never shown again

**Revoke Flow:**
1. Click "Revoke" → confirmation dialog
2. Confirm → key marked as revoked

## API Communication

Dashboard connects to the API server. Configuration:

```typescript
// Environment variable
NEXT_PUBLIC_API_URL=http://localhost:3456

// API client helper
async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = getStoredAPIKey(); // From localStorage
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new APIError(error);
  }
  return res.json();
}
```

## Initial Setup Flow

On first visit (no API key stored):
1. Show setup page: "Enter your API key to connect to StableFlow"
2. Input field for API key
3. Validate by calling `GET /health` with the key
4. Store in localStorage
5. Redirect to Overview

## Component Library

Using shadcn/ui components:
- `Card` — metric displays
- `Table` — data tables
- `Dialog` — modals for create/revoke
- `Button` — actions
- `Badge` — status indicators (green=active, red=revoked, etc.)
- `Input` — form fields
- `Alert` — API key display, warnings
- `Sidebar` — navigation
