# Phase 4: Data Model

## New Tables

### `products`

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,                              -- "prd_01JQXR..."
  account_holder_id TEXT NOT NULL REFERENCES account_holders(id),
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL
    CHECK (price > 0),
  currency TEXT NOT NULL
    CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  inventory_count INTEGER NOT NULL DEFAULT -1,      -- -1 = unlimited
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (inventory_count >= -1)
);

CREATE INDEX idx_products_holder ON products(account_holder_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created ON products(created_at);
```

### `payment_links`

```sql
CREATE TABLE payment_links (
  id TEXT PRIMARY KEY,                              -- "lnk_01JQXR..."
  account_holder_id TEXT NOT NULL REFERENCES account_holders(id),
  product_id TEXT REFERENCES products(id),
  slug TEXT NOT NULL,
  amount BIGINT NOT NULL
    CHECK (amount > 0),
  currency TEXT NOT NULL
    CHECK (currency IN ('USD', 'EUR', 'USDC', 'USDT')),
  single_use BOOLEAN NOT NULL DEFAULT false,
  used BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'used', 'disabled')),
  metadata JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_payment_links_slug ON payment_links(slug);
CREATE INDEX idx_payment_links_holder ON payment_links(account_holder_id);
CREATE INDEX idx_payment_links_product ON payment_links(product_id);
CREATE INDEX idx_payment_links_status ON payment_links(status);
```

## Relationships

```
products.account_holder_id → account_holders.id
payment_links.account_holder_id → account_holders.id
payment_links.product_id → products.id (optional)
```

## Constraints Summary

### Products
- `price > 0` — no free or negative-priced products
- `inventory_count >= -1` — -1 means unlimited, 0 means out of stock
- `status IN ('active', 'archived')` — archived products not purchasable

### Payment Links
- `slug UNIQUE` — globally unique slugs (INV-PR3)
- `amount > 0` — valid payment amount
- `single_use + used` — tracks single-use enforcement (INV-PR2)
- `status` — lifecycle tracking

## Migration

Phase 4 migration adds:
1. `products` table
2. `payment_links` table
3. All indexes including unique slug index
4. Foreign keys to `account_holders` and `products`
