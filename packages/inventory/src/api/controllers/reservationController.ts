/**
 * Reservation Controller
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { InventoryContainer } from '../../container';

export function makeReservationController(c: InventoryContainer) {
  return {
    async createReservation(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const lines = Array.isArray(body.lines) ? body.lines : [];
      if (lines.length === 0) {
        void reply.code(400);
        return { ok: false, error: 'lines[] is required' };
      }
      const dto = {
        id: String(body.id ?? `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        orderId: String(body.orderId),
        customerId: String(body.customerId),
        lines: lines.map((l: Record<string, unknown>) => ({
          productId: String(l.productId),
          locationId: String(l.locationId ?? 'MAIN'),
          lotId: l.lotId == null ? null : String(l.lotId),
          quantity: String(l.quantity),
          uom: String(l.uom ?? 'EA'),
        })),
        expiresAt: body.expiresAt == null ? null : new Date(String(body.expiresAt)),
        notes: body.notes == null ? null : String(body.notes),
      };
      const result = await c.commands.createReservation.execute(dto);
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      void reply.code(201);
      return result;
    },

    async releaseReservation(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const reservationId = String(body.reservationId);
      const dto: { reservationId: string; reason?: string } = { reservationId };
      if (body.reason != null) dto.reason = String(body.reason);
      const result = await c.commands.releaseReservation.execute(dto);
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      return result;
    },

    async commitReservation(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const reservationId = String(body.reservationId);
      const result = await c.commands.commitReservation.execute({ reservationId });
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      return result;
    },

    async getReservation(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const result = await c.queries.getReservation.execute(id);
      if (!result.ok) {
        void reply.code(404);
        return result;
      }
      return result;
    },

    async listReservations(req: FastifyRequest, _reply: FastifyReply) {
      const q = req.query as Record<string, string | undefined>;
      const query: Record<string, unknown> = {};
      if (q.orderId) query.orderId = q.orderId;
      if (q.customerId) query.customerId = q.customerId;
      if (q.status) query.status = q.status;
      if (q.locationId) query.locationId = q.locationId;
      if (q.productId) query.productId = q.productId;
      if (q.activeOnly) query.activeOnly = q.activeOnly === 'true';
      if (q.limit) query.limit = Number(q.limit);
      if (q.offset) query.offset = Number(q.offset);
      return c.queries.listReservations.execute(query as never);
    },
  };
}
