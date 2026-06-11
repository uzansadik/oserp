export const InventoryEventNames = {
  // Product (Faz 1)
  ProductCreated: 'inv.product.created',
  ProductTypeChanged: 'inv.product.type_changed',
  ProductDiscontinued: 'inv.product.discontinued',
  ReorderPolicyChanged: 'inv.product.reorder_policy_changed',
  ProductBarcodeAdded: 'inv.product.barcode_added',
  ProductBarcodeRemoved: 'inv.product.barcode_removed',
  // Stock movements (Faz 2)
  StockReceived: 'inv.stock.received',
  StockIssued: 'inv.stock.issued',
  StockTransferred: 'inv.stock.transferred',
  StockAdjusted: 'inv.stock.adjusted',
  StockScrapped: 'inv.stock.scrapped',
  StockLevelChanged: 'inv.stock.level_changed',
} as const;

export type InventoryEventName =
  (typeof InventoryEventNames)[keyof typeof InventoryEventNames];
