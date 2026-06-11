/**
 * Lot Controller
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { InventoryContainer } from '../../container';
import { aggregateToView, lotToView } from '../../application/dto/LotDTOs';

export function makeLotController(c: InventoryContainer) {
  return {
    async create(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const id = await c.commands.createLot.execute({
        id: body.id ? String(body.id) : undefined,
        productId: String(body.productId),
        locationId: String(body.locationId),
        quantity: String(body.quantity),
        uom: String(body.uom),
        expiryDate: (body.expiryDate as string | null | undefined) ?? null,
        mfgDate: (body.mfgDate as string | null | undefined) ?? null,
        supplierLotCode: (body.supplierLotCode as string | null | undefined) ?? null,
        serialNumbers: Array.isArray(body.serialNumbers)
          ? (body.serialNumbers as unknown[]).map((s) => String(s))
          : [],
        notes: (body.notes as string | null | undefined) ?? null,
      });
      void reply.code(201);
      return { id };
    },

    async dispatch(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      const result = await c.commands.dispatchLots.execute({
        productId: String(body.productId),
        locationId: String(body.locationId),
        requestedQuantity: String(body.requestedQuantity),
        asOf: body.asOf ? String(body.asOf) : undefined,
        reason: body.reason ? String(body.reason) : undefined,
      });
      return result;
    },

    async expire(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      const dto: { at: string; productId?: string; locationId?: string } = {
        at: String(body.at),
      };
      if (body.productId) dto.productId = String(body.productId);
      if (body.locationId) dto.locationId = String(body.locationId);
      const r = await c.commands.expireLots.execute(dto);
      return r;
    },

    async quarantine(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      await c.commands.quarantineLot.execute({
        lotId: String(body.lotId),
        reason: body.reason ? String(body.reason) : null,
      });
      return { ok: true };
    },

    async allocateSerials(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      await c.commands.allocateSerials.execute({
        lotId: String(body.lotId),
        serialNumbers: Array.isArray(body.serialNumbers)
          ? (body.serialNumbers as unknown[]).map((s) => String(s))
          : [],
      });
      return { ok: true };
    },

    async getAggregate(req: FastifyRequest, reply: FastifyReply) {
      const params = req.params as { productId: string; locationId: string };
      const agg = await c.queries.getLotAggregate.execute(params.productId, params.locationId);
      if (!agg) {
        void reply.code(404);
        return { error: 'Aggregate not found' };
      }
      return aggregateToView(agg);
    },

    async list(req: FastifyRequest) {
      const q = req.query as { productId?: string; locationId?: string };
      const lots = await c.queries.listLots.execute(
        q.productId,
        q.locationId,
      );
      return lots.map(lotToView);
    },
  };
}
