import { z } from 'zod';
import {
  movementTypeEnum,
} from '../commands/StockMovementCommands';

// ── GetStockMovements ──
export const getStockMovementsSchema = z.object({
  productId: z.string().uuid().optional(),
  type: movementTypeEnum.optional(),
  fromLocationId: z.string().max(64).optional(),
  toLocationId: z.string().max(64).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().positive().max(500).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});
export type GetStockMovementsQuery = z.infer<typeof getStockMovementsSchema>;

// ── GetStockLevel ──
export const getStockLevelSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().max(64).default('DEFAULT-WH'),
  lotId: z.string().max(64).optional().nullable(),
});
export type GetStockLevelQuery = z.infer<typeof getStockLevelSchema>;

// ── ListLowStock ──
export const listLowStockSchema = z.object({
  status: z.enum(['LOW', 'OUT', 'OVERSTOCK']).default('LOW'),
  limit: z.number().int().positive().max(500).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});
export type ListLowStockQuery = z.infer<typeof listLowStockSchema>;

// ── GetStockValuation ──
export const getStockValuationSchema = z.object({
  productId: z.string().uuid(),
});
export type GetStockValuationQuery = z.infer<typeof getStockValuationSchema>;
