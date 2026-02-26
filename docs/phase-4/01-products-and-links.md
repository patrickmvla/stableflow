# Phase 4: Products & Payment Links

## Package: `packages/products/`

Product catalog and shareable payment links. Enables the full commerce flow: create product → generate link → customer pays → settlement to stablecoins.

## Products

### Model

```typescript
interface Product {
  id: string;                    // "prd_01JQXR..."
  accountHolderId: string;
  name: string;
  description?: string;
  price: bigint;                 // In minor units
  currency: Currency;
  inventoryCount: number;        // -1 = unlimited
  status: "active" | "archived";
  metadata: Record<string, unknown>;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Service Functions

#### `createProduct(db, input)`

```typescript
interface CreateProductInput {
  accountHolderId: string;
  name: string;
  description?: string;
  price: bigint;
  currency: Currency;
  inventoryCount?: number;  // Default: -1 (unlimited)
  metadata?: Record<string, unknown>;
  imageUrl?: string;
}
```

Validates:
- Price > 0
- Supported currency
- Account holder exists and is active

#### `updateProduct(db, id, input)`

```typescript
interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: bigint;
  inventoryCount?: number;
  status?: "active" | "archived";
  metadata?: Record<string, unknown>;
  imageUrl?: string;
}
```

Partial update — only provided fields change.

#### `getProduct(db, id)`

Returns product or throws `NotFoundError`.

#### `listProducts(db, accountHolderId, pagination)`

Cursor-paginated list of products for an account holder.

#### `decrementInventory(db, productId)`

Atomically decrement inventory using pessimistic locking:

```typescript
async function decrementInventory(db: Database, productId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .for("update");

    if (!product) throw new NotFoundError("Product not found");
    if (product.inventoryCount === 0) throw new InsufficientInventoryError(productId);
    if (product.inventoryCount === -1) return; // Unlimited, no decrement

    await tx
      .update(products)
      .set({ inventoryCount: product.inventoryCount - 1, updatedAt: new Date() })
      .where(eq(products.id, productId));
  });
}
```

**INV-PR1:** Inventory never goes negative. `FOR UPDATE` + check prevents overselling.

## Payment Links

### Model

```typescript
interface PaymentLink {
  id: string;                    // "lnk_01JQXR..."
  accountHolderId: string;
  productId?: string;            // Optional — can be standalone amount
  slug: string;                  // Unique URL slug: "acme-widget-x7k2"
  amount: bigint;                // Price (from product or custom)
  currency: Currency;
  singleUse: boolean;            // If true, can only be used once
  used: boolean;                 // For single-use links
  expiresAt?: Date;
  status: "active" | "expired" | "used" | "disabled";
  metadata: Record<string, unknown>;
  createdAt: Date;
}
```

### Slug Generation

```typescript
function generateSlug(name: string): string {
  // Slugify name + append random suffix
  // "Acme Widget" → "acme-widget-x7k2"
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = randomBytes(3).toString("hex").slice(0, 4);
  return `${base}-${suffix}`;
}
```

**INV-PR3:** Slugs are globally unique (UNIQUE constraint). Retry with new suffix on collision.

### Service Functions

#### `createPaymentLink(db, input)`

```typescript
interface CreatePaymentLinkInput {
  accountHolderId: string;
  productId?: string;
  amount?: bigint;         // Required if no productId
  currency?: Currency;     // Required if no productId
  singleUse?: boolean;     // Default: false
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}
```

If `productId` provided, amount and currency come from the product.

#### `getPaymentLinkBySlug(db, slug)`

Public endpoint — no auth required. Returns the payment link with product info if applicable.

#### `usePaymentLink(db, slug)`

Called when a customer accesses the link and pays:

```typescript
async function usePaymentLink(db: Database, slug: string): Promise<PaymentIntent> {
  return db.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.slug, slug))
      .for("update");

    if (!link) throw new NotFoundError("Payment link not found");
    if (link.status !== "active") throw new ValidationError("Payment link is not active");
    if (link.expiresAt && link.expiresAt < new Date()) throw new ValidationError("Payment link expired");
    if (link.singleUse && link.used) throw new ValidationError("Payment link already used");

    // Decrement inventory if linked to product
    if (link.productId) {
      await decrementInventory(tx, link.productId);
    }

    // Mark as used if single-use
    if (link.singleUse) {
      await tx.update(paymentLinks)
        .set({ used: true, status: "used" })
        .where(eq(paymentLinks.id, link.id));
    }

    // Create payment intent
    return createPaymentIntent(tx, {
      accountHolderId: link.accountHolderId,
      amount: link.amount,
      currency: link.currency,
      description: `Payment via link ${link.slug}`,
      metadata: { paymentLinkId: link.id, ...link.metadata },
    });
  });
}
```

**INV-PR2:** Single-use enforcement via `FOR UPDATE` + status check.

#### `listPaymentLinks(db, accountHolderId)`

List all payment links for a merchant.

## Demo Mode

### What It Does

Demo mode auto-generates activity to showcase the full platform:

1. Creates sample merchants with virtual accounts (USD + USDC on Polygon)
2. Creates sample products
3. Generates payment links
4. Runs simulated payments through the full lifecycle
5. Triggers settlements with real-time progression
6. All visible on the dashboard in real-time

### Speed Control

```typescript
interface DemoConfig {
  speedMultiplier: number;  // 1x, 5x, 20x
  autoCreateMerchants: boolean;
  paymentInterval: number;  // ms between simulated payments
  maxPayments: number;      // Stop after N payments
}
```

At 1x speed: ~2 min per full payment → settlement cycle
At 5x speed: ~24 sec
At 20x speed: ~6 sec

### Implementation

```typescript
// packages/api/src/demo.ts
async function startDemoMode(config: DemoConfig): Promise<void> {
  // 1. Seed demo data
  const merchant = await createAccountHolder(db, { name: "Demo Merchant", email: "demo@example.com" });
  const usdAccount = await createVirtualAccount(db, { accountHolderId: merchant.id, currency: "USD" });
  const usdcAccount = await createVirtualAccount(db, { accountHolderId: merchant.id, currency: "USDC", network: "polygon" });

  // 2. Create products
  const product = await createProduct(db, { accountHolderId: merchant.id, name: "Widget", price: 10000n, currency: "USD" });

  // 3. Run payment loop
  const interval = setInterval(async () => {
    // Create and process payment
    const payment = await createPaymentIntent(db, { ... });
    await confirmPaymentIntent(db, payment.id);
    // Settlement auto-created, progresses with speedMultiplier
  }, config.paymentInterval / config.speedMultiplier);
}
```

### API Endpoints

```
POST /api/v1/demo/start
  Body: { "speed": 5 }
  Response: 200 { "status": "running", "speed": 5 }

POST /api/v1/demo/stop
  Response: 200 { "status": "stopped" }

GET /api/v1/demo/status
  Response: 200 { "status": "running", "speed": 5, "payments_created": 12 }
```
