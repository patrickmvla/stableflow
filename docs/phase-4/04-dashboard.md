# Phase 4: Dashboard Updates

## New Pages

### Products Page (`/products`)

Product catalog management.

**Products Table:**
| Name | Price | Currency | Inventory | Status | Created |
|------|-------|----------|-----------|--------|---------|
| Premium Widget | $50.00 | USD | 100 | Active | Feb 24 |
| Basic Plan | $10.00 | USD | Unlimited | Active | Feb 24 |

**Actions:**
- "Create Product" button → modal with form fields
- Click row → expand to edit inline or open detail
- "Archive" button per row

**Create/Edit Product Form:**
```
Name:        [____________]
Description: [____________]
Price:       [____] Currency: [USD ▼]
Inventory:   [____] (leave blank for unlimited)
Image URL:   [____________]
```

### Payment Links Page (`/payment-links`)

Generate and manage shareable payment links.

**Payment Links Table:**
| Slug | Product | Amount | Single Use | Status | Created |
|------|---------|--------|------------|--------|---------|
| premium-widget-x7k2 | Premium Widget | $50.00 | Yes | Active | Feb 24 |
| donate-a3b4 | — | $25.00 | No | Active | Feb 24 |

**Actions:**
- "Create Link" button → modal

**Create Link Form:**
```
Link Type: ○ Product  ○ Custom Amount
Product:   [Select Product ▼]     (if product type)
Amount:    [____]                  (if custom type)
Currency:  [USD ▼]                (if custom type)
Single Use: [✓]
Expires:    [____]  (optional date picker)
```

**Link Preview:**
After creation, show the shareable link with copy button:
```
┌──────────────────────────────────────────────┐
│ Payment Link Created!                         │
│                                               │
│ http://localhost:3456/pay/premium-widget-x7k2 │
│                                     [Copy 📋] │
│                                               │
│ QR code (optional stretch goal)               │
└──────────────────────────────────────────────┘
```

### Demo Mode (Toggle in Header)

**Header Update:**
```
┌─────────────────────────────────────────────────────┐
│  StableFlow    [Demo Mode: OFF ○]    [sf_live_...] │
└─────────────────────────────────────────────────────┘
```

**Demo Mode Controls (when active):**
```
┌──────────────────────────────────────────────┐
│ 🎬 Demo Mode                          [Stop] │
│                                               │
│ Speed: [1x] [5x] [20x]                      │
│                                               │
│ Stats:                                        │
│ Payments Created:    25                       │
│ Payments Succeeded:  20                       │
│ Settlements Created: 20                       │
│ Settlements Settled: 15                       │
│                                               │
│ Live activity visible on all pages            │
└──────────────────────────────────────────────┘
```

**What Happens When Demo Starts:**
1. Toggle slides to ON, speed selector appears
2. Demo data seeded (merchants, products, links) — toast notification
3. Payments start flowing automatically
4. Settlements page lights up with live progress
5. Overview dashboard metrics update in real-time
6. All activity visible across all dashboard pages
7. Speed slider adjusts in real-time (1x → 5x → 20x)

**Speed Slider Effect:**
- 1x: Real-time blockchain simulation (~2 min per settlement)
- 5x: Fast-forward (~24 sec per settlement)
- 20x: Rapid demo (~6 sec per settlement)

## Updated Pages

### Overview Page (`/`)

**New cards:**
- Total Products — count of active products
- Active Payment Links — count of active links
- Demo Mode indicator (if running)

### All Pages

When demo mode is running, a subtle pulsing indicator appears in the sidebar:
```
● Demo Mode Active (5x)
```

## User Flow: Full Demo

1. Click "Demo Mode: OFF" in header
2. Select speed: 5x
3. Click Start
4. Watch Overview page: metrics climbing
5. Navigate to Payments: new payments appearing
6. Navigate to Settlements: progress bars moving
7. Navigate to Accounts: balances increasing
8. Navigate to Ledger: god check stays green
9. Adjust speed to 20x: everything accelerates
10. Click Stop: demo pauses, all data remains for inspection
