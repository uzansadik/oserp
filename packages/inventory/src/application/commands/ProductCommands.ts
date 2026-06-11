import { z } from 'zod';

// ── enums (DB'de tutulan değerlerle aynı) ──────────────────────────────
const productTypeEnum = z.enum(['STORABLE', 'CONSUMABLE', 'SERVICE', 'KIT']);
const procurementPolicyEnum = z.enum([
  'MAKE_TO_ORDER',
  'MAKE_TO_STOCK',
  'BUY',
  'NONE',
]);
const trackingTypeEnum = z.enum(['NONE', 'LOT', 'SERIAL']);
const productStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']);
const barcodeSymbologyEnum = z.enum([
  'EAN13',
  'EAN8',
  'UPC',
  'CODE128',
  'CODE39',
  'QR',
  'CUSTOM',
]);

const barcodeSchema = z.object({
  code: z.string().min(4).max(64),
  symbology: barcodeSymbologyEnum.default('CUSTOM'),
  isPrimary: z.boolean().default(false),
});

// ── CreateProduct ──────────────────────────────────────────────────────
export const createProductSchema = z.object({
  sku: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[A-Za-z0-9_\-]+$/, 'SKU may contain letters, digits, - and _'),
  name: z.string().min(1).max(256),
  description: z.string().max(4096).optional().nullable(),
  type: productTypeEnum,
  procurementPolicy: procurementPolicyEnum,
  trackingType: trackingTypeEnum.optional().default('NONE'),
  baseUom: z.string().min(1).max(16).optional().default('UNT'),
  categoryId: z.string().uuid().optional().nullable(),
  reorderPolicy: z
    .object({
      minQty: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
      maxQty: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
      reorderQty: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
      safetyStock: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
    })
    .optional(),
  initialBarcode: barcodeSchema.optional(),
});
export type CreateProductCommand = z.infer<typeof createProductSchema>;

// ── UpdateProduct ─────────────────────────────────────────────────────
export const updateProductSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(4096).optional().nullable(),
  baseUom: z.string().min(1).max(16).optional(),
  categoryId: z.string().uuid().optional().nullable(),
});
export type UpdateProductCommand = z.infer<typeof updateProductSchema>;

// ── ChangeProductType ─────────────────────────────────────────────────
export const changeProductTypeSchema = z.object({
  productId: z.string().uuid(),
  newType: productTypeEnum,
});
export type ChangeProductTypeCommand = z.infer<typeof changeProductTypeSchema>;

// ── DiscontinueProduct ────────────────────────────────────────────────
export const discontinueProductSchema = z.object({
  productId: z.string().uuid(),
});
export type DiscontinueProductCommand = z.infer<typeof discontinueProductSchema>;

// ── SetReorderPolicy ──────────────────────────────────────────────────
export const setReorderPolicySchema = z.object({
  productId: z.string().uuid(),
  reorderPolicy: z
    .object({
      minQty: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
      maxQty: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
      reorderQty: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
      safetyStock: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
    })
    .optional()
    .default({}),
});
export type SetReorderPolicyCommand = z.infer<typeof setReorderPolicySchema>;

// ── AddBarcode ────────────────────────────────────────────────────────
export const addBarcodeSchema = z.object({
  productId: z.string().uuid(),
  barcode: barcodeSchema,
});
export type AddBarcodeCommand = z.infer<typeof addBarcodeSchema>;

// ── RemoveBarcode ─────────────────────────────────────────────────────
export const removeBarcodeSchema = z.object({
  productId: z.string().uuid(),
  code: z.string().min(4).max(64),
});
export type RemoveBarcodeCommand = z.infer<typeof removeBarcodeSchema>;

// ── Re-exports ────────────────────────────────────────────────────────
export {
  productTypeEnum,
  procurementPolicyEnum,
  trackingTypeEnum,
  productStatusEnum,
  barcodeSymbologyEnum,
};
