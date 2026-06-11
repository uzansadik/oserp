export const InventoryEventNames = {
  // Product
  ProductCreated: 'inv.product.created',
  ProductTypeChanged: 'inv.product.type_changed',
  ProductDiscontinued: 'inv.product.discontinued',
  ReorderPolicyChanged: 'inv.product.reorder_policy_changed',
  ProductBarcodeAdded: 'inv.product.barcode_added',
  ProductBarcodeRemoved: 'inv.product.barcode_removed',
} as const;

export type InventoryEventName =
  (typeof InventoryEventNames)[keyof typeof InventoryEventNames];
