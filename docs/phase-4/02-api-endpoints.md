# Phase 4: API Endpoints

## Product Routes

### Create Product

```
POST /api/v1/products
Headers: Idempotency-Key: <unique-key>
```

Request:
```json
{
  "name": "Premium Widget",
  "description": "A high-quality widget for enterprise use",
  "price": "5000",
  "currency": "USD",
  "inventory_count": 100,
  "metadata": { "sku": "WIDGET-001" },
  "image_url": "https://example.com/widget.jpg"
}
```

Response `201`:
```json
{
  "object": "product",
  "id": "prd_01JQXR5...",
  "account_holder_id": "acc_01JQXR5...",
  "name": "Premium Widget",
  "description": "A high-quality widget for enterprise use",
  "price": "5000",
  "currency": "USD",
  "inventory_count": 100,
  "status": "active",
  "metadata": { "sku": "WIDGET-001" },
  "image_url": "https://example.com/widget.jpg",
  "created_at": "2026-02-24T12:00:00Z",
  "updated_at": "2026-02-24T12:00:00Z"
}
```

### List Products

```
GET /api/v1/products?limit=20&cursor=prd_01...
```

Response `200`: Paginated list of products.

### Get Product

```
GET /api/v1/products/:id
```

Response `200`: Single product object.

### Update Product

```
PATCH /api/v1/products/:id
```

Request (partial update):
```json
{
  "price": "6000",
  "inventory_count": 50
}
```

Response `200`: Updated product object.

## Payment Link Routes

### Create Payment Link

```
POST /api/v1/payment-links
Headers: Idempotency-Key: <unique-key>
```

Request (with product):
```json
{
  "product_id": "prd_01JQXR5...",
  "single_use": true
}
```

Request (standalone):
```json
{
  "amount": "2500",
  "currency": "USD",
  "single_use": false,
  "expires_at": "2026-03-24T12:00:00Z"
}
```

Response `201`:
```json
{
  "object": "payment_link",
  "id": "lnk_01JQXR5...",
  "account_holder_id": "acc_01JQXR5...",
  "product_id": "prd_01JQXR5...",
  "slug": "premium-widget-x7k2",
  "url": "http://localhost:3456/api/v1/payment-links/premium-widget-x7k2",
  "amount": "5000",
  "currency": "USD",
  "single_use": true,
  "used": false,
  "status": "active",
  "expires_at": null,
  "created_at": "2026-02-24T12:00:00Z"
}
```

### List Payment Links

```
GET /api/v1/payment-links?limit=20&cursor=lnk_01...
```

Response `200`: Paginated list of payment links.

### Get Payment Link (Public)

```
GET /api/v1/payment-links/:slug
```

**No auth required.** This is the public-facing endpoint.

Response `200`:
```json
{
  "object": "payment_link",
  "slug": "premium-widget-x7k2",
  "product": {
    "name": "Premium Widget",
    "description": "A high-quality widget for enterprise use",
    "image_url": "https://example.com/widget.jpg"
  },
  "amount": "5000",
  "currency": "USD",
  "formatted_amount": "$50.00",
  "status": "active"
}
```

Returns 404 if link doesn't exist, 410 if used/expired.

## Demo Mode Routes

### Start Demo

```
POST /api/v1/demo/start
```

Request:
```json
{
  "speed": 5
}
```

Response `200`:
```json
{
  "object": "demo_status",
  "status": "running",
  "speed": 5,
  "started_at": "2026-02-24T12:00:00Z"
}
```

### Stop Demo

```
POST /api/v1/demo/stop
```

Response `200`:
```json
{
  "object": "demo_status",
  "status": "stopped",
  "payments_created": 25,
  "settlements_completed": 20,
  "stopped_at": "2026-02-24T12:05:00Z"
}
```

### Get Demo Status

```
GET /api/v1/demo/status
```

Response `200`:
```json
{
  "object": "demo_status",
  "status": "running",
  "speed": 5,
  "payments_created": 12,
  "payments_succeeded": 10,
  "settlements_created": 10,
  "settlements_completed": 7,
  "started_at": "2026-02-24T12:00:00Z"
}
```

## Error Responses

```json
// 404 - Product not found
{ "error": { "type": "product_not_found", "message": "Product prd_01... not found" } }

// 422 - Insufficient inventory
{
  "error": {
    "type": "insufficient_inventory",
    "message": "Product is out of stock",
    "details": { "product_id": "prd_01...", "inventory_count": 0 }
  }
}

// 410 - Payment link used
{ "error": { "type": "payment_link_used", "message": "This payment link has already been used" } }

// 410 - Payment link expired
{ "error": { "type": "payment_link_expired", "message": "This payment link has expired" } }
```
