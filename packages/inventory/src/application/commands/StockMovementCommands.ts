import { z } from 'zod';
import {
  productTypeEnum,
  barcodeSymbologyEnum,
} from './ProductCommands';

const movementTypeEnum = z.enum(['RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'SCRAP']);
const documentTypeEnum = z.enum([
  'PURCHASE_ORDER',
  'SALES_ORDER',
  'PRODUCTION_ORDER',
  'TRANSFER_ORDER',
  'ADJUSTMENT',
  'MANUAL',
]);

const movementLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, 'quantity must be positive decimal'),
  uom: z.string().min(1).max(16).default('UNT'),
  lotId: z.string().max(64).optional().nullable(),
  fromLocationId: z.string().max(64).optional().nullable(),
  toLocationId: z.string().max(64).optional().nullable(),
  unitCost: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
});

const documentRefSchema = z.object({
  type: documentTypeEnum.default('MANUAL'),
  documentId: z.string().max(64).optional().nullable(),
});

// ── PostReceipt ──
export const postReceiptSchema = z.object({
  lines: z.array(movementLineSchema).min(1),
  documentRef: documentRefSchema.default({ type: 'MANUAL' }),
  postedBy: z.string().uuid(),
  postedAt: z.string().datetime().optional(),
});
export type PostReceiptCommand = z.infer<typeof postReceiptSchema>;

// ── PostIssue ──
export const postIssueSchema = z.object({
  lines: z.array(movementLineSchema).min(1),
  documentRef: documentRefSchema.default({ type: 'MANUAL' }),
  postedBy: z.string().uuid(),
  postedAt: z.string().datetime().optional(),
});
export type PostIssueCommand = z.infer<typeof postIssueSchema>;

// ── PostTransfer ──
export const postTransferSchema = z.object({
  lines: z.array(movementLineSchema).min(1),
  postedBy: z.string().uuid(),
  postedAt: z.string().datetime().optional(),
});
export type PostTransferCommand = z.infer<typeof postTransferSchema>;

// ── PostAdjustment ──
export const postAdjustmentSchema = z.object({
  lines: z.array(
    movementLineSchema.extend({
      quantity: z.string().regex(/^[+-]?\d+(\.\d+)?$/, 'quantity: signed decimal (+/-)'),
    }),
  ).min(1),
  reasonCode: z.string().regex(/^[A-Z0-9_\-]{1,32}$/),
  documentRef: documentRefSchema.default({ type: 'ADJUSTMENT' }),
  postedBy: z.string().uuid(),
  postedAt: z.string().datetime().optional(),
});
export type PostAdjustmentCommand = z.infer<typeof postAdjustmentSchema>;

// ── PostScrap ──
export const postScrapSchema = z.object({
  lines: z.array(movementLineSchema).min(1),
  reasonCode: z.string().regex(/^[A-Z0-9_\-]{1,32}$/),
  documentRef: documentRefSchema.default({ type: 'ADJUSTMENT' }),
  postedBy: z.string().uuid(),
  postedAt: z.string().datetime().optional(),
});
export type PostScrapCommand = z.infer<typeof postScrapSchema>;

export {
  movementTypeEnum,
  documentTypeEnum,
  movementLineSchema,
  documentRefSchema,
};
