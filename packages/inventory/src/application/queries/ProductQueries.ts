import { z } from 'zod';
import {
  productStatusEnum,
  productTypeEnum,
} from '../commands/ProductCommands';

// ── GetProductById ────────────────────────────────────────────────────
export const getProductByIdSchema = z.object({
  productId: z.string().uuid(),
});
export type GetProductByIdQuery = z.infer<typeof getProductByIdSchema>;

// ── GetProductBySku ───────────────────────────────────────────────────
export const getProductBySkuSchema = z.object({
  sku: z.string().min(2).max(64),
});
export type GetProductBySkuQuery = z.infer<typeof getProductBySkuSchema>;

// ── ListProducts ──────────────────────────────────────────────────────
export const listProductsSchema = z.object({
  sku: z.string().optional(),
  type: productTypeEnum.optional(),
  status: productStatusEnum.optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().max(256).optional(),
  limit: z.number().int().positive().max(200).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});
export type ListProductsQuery = z.infer<typeof listProductsSchema>;
