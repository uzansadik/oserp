# @oserp-community/inventory

Inventory (Stok/Ürün) bounded context — DDD + CQRS + Event-Driven.

## Faz 1 Kapsamı (bu commit)

- **Product aggregate** (master data): SKU, name, type, UoM, procurement policy,
  tracking type, reorder policy, status, barcodes
- 7 use-case handler + 3 query handler
- Drizzle persistence (Drizzle + Postgres) + Transactional Outbox
- InMemory adapter'lar (test'ler için)
- HTTP API: 10 uç (`/inventory/products/*`)
- 39 unit test (hepsi yeşil)

## Aggregate boundary (Faz 1'de)

- `Product` aggregate — ürün kataloğu (master data)
  - Fiyat **yok** (→ `PriceList`, Faz 3)
  - Stok miktarı **yok** (→ `InventoryLevel`, Faz 2)
  - Lokasyon **yok** (→ `Warehouse`, Faz 5)
  - Üretim reçetesi **yok** (→ `BOM`, Faz 6)

## Value Objects

- `ProductId` (UUID v4)
- `Sku` (business key, [A-Z0-9_-]{2,64})
- `ProductType` (STORABLE | CONSUMABLE | SERVICE | KIT)
- `ProcurementPolicy` (MTO | MTS | BUY | NONE)
- `TrackingType` (NONE | LOT | SERIAL)
- `Uom` ([A-Z0-9_-]{1,16})
- `Barcode` (symbology-aware; EAN13/EAN8/UPC format doğrular)
- `ProductStatus` (ACTIVE | INACTIVE | DISCONTINUED)
- `ReorderPolicy` (min/max/reorder/safety, opsiyonel)
- `Money` (bigint tabanlı, scale=6, ISO 4217 currency) — Faz 2/3'te kullanılacak

## Domain Events

- `ProductCreated`
- `ProductTypeChanged`
- `ProductDiscontinued`
- `ReorderPolicyChanged`
- `ProductBarcodeAdded`
- `ProductBarcodeRemoved`

## HTTP API (Faz 1)

```
POST   /inventory/products                    # Create
GET    /inventory/products                    # List (filter: sku, type, status, categoryId, search, limit, offset)
GET    /inventory/products/:productId         # GetById
GET    /inventory/products/by-sku/:sku        # GetBySku
PATCH  /inventory/products/:productId         # Update (name, description, baseUom, categoryId)
POST   /inventory/products/:productId/change-type
POST   /inventory/products/:productId/discontinue
POST   /inventory/products/:productId/reorder-policy
POST   /inventory/products/:productId/barcodes
DELETE /inventory/products/:productId/barcodes/:code
```

## Persistence

Drizzle şema dosyaları:
- `inv_products` — ürün kataloğu
- `inv_product_barcodes` — barkodlar (1:N, cascade delete)
- `inv_outbox` — transactional outbox

`pnpm db:generate` → migration üretir.

## Test

```bash
pnpm test                    # 39 test
pnpm test:watch              # watch modu
```

## Kullanım (apps/api)

```ts
import { createInventoryContainer, createInventoryDb } from '@oserp-community/inventory';
import { inventoryRouter } from '@oserp-community/inventory/api';

const db = createInventoryDb(process.env.DATABASE_URL);
const container = createInventoryContainer({ db });

await app.register(inventoryRouter, { container, prefix: '/inventory' });
```

## Yapı (IAM ile aynı)

```
src/
├── domain/         (errors, value-objects, events, entities, aggregates)
├── application/    (commands, queries, handlers, ports, services, policies, dto)
├── infrastructure/ (clock, crypto, event-store, persistance)
├── api/            (routes, controllers, errors)
├── interfaces/     (IDomainEvent)
├── container.ts
├── index.ts
└── _test/          (support, unit, integration)
```

## Sonraki Fazlar

- Faz 2: StockMovement + InventoryLevel (stok hareketleri)
- Faz 3: PriceList + multi-currency
- Faz 4: Lot + seri/lot
- Faz 5: Warehouse context (lokasyon)
- Faz 6: BOM context
- Faz 7: Reservation
- Faz 8: Sales.Catalog → Inventory migration
- Faz 9: Backoffice UI
