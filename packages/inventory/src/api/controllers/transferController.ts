/**
 * Transfer Controller
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { InventoryContainer } from '../../container';

export function makeTransferController(c: InventoryContainer) {
  return {
    async createTransfer(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const lines = Array.isArray(body.lines) ? body.lines : [];
      if (lines.length === 0) {
        void reply.code(400);
        return { ok: false, error: 'lines[] is required' };
      }
      const dto: {
        id: string;
        transferNumber?: string;
        sourceLocationId: string;
        destinationLocationId: string;
        lines: Array<{ productId: string; lotId: string | null; requestedQuantity: string; uom: string }>;
        reason?: string | null;
        notes?: string | null;
      } = {
        id: String(body.id ?? `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        sourceLocationId: String(body.sourceLocationId),
        destinationLocationId: String(body.destinationLocationId),
        lines: lines.map((l: Record<string, unknown>) => ({
          productId: String(l.productId),
          lotId: l.lotId == null ? null : String(l.lotId),
          requestedQuantity: String(l.requestedQuantity),
          uom: String(l.uom ?? 'EA'),
        })),
      };
      if (body.transferNumber != null) dto.transferNumber = String(body.transferNumber);
      if (body.reason != null) dto.reason = String(body.reason);
      if (body.notes != null) dto.notes = String(body.notes);
      const result = await c.commands.createTransfer.execute(dto);
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      void reply.code(201);
      return result;
    },

    async dispatchTransfer(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const transferId = String(body.transferId);
      const dto: {
        transferId: string;
        lineDispatches?: Array<{ productId: string; dispatchedQuantity: string }>;
      } = { transferId };
      if (Array.isArray(body.lineDispatches)) {
        dto.lineDispatches = body.lineDispatches.map((d: Record<string, unknown>) => ({
          productId: String(d.productId),
          dispatchedQuantity: String(d.dispatchedQuantity),
        }));
      }
      const result = await c.commands.dispatchTransfer.execute(dto);
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      return result;
    },

    async receiveTransfer(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const transferId = String(body.transferId);
      const receives = Array.isArray(body.lineReceives) ? body.lineReceives : [];
      if (receives.length === 0) {
        void reply.code(400);
        return { ok: false, error: 'lineReceives[] is required' };
      }
      const result = await c.commands.receiveTransfer.execute({
        transferId,
        lineReceives: receives.map((r: Record<string, unknown>) => ({
          productId: String(r.productId),
          receivedQuantity: String(r.receivedQuantity),
        })),
      });
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      return result;
    },

    async closeTransfer(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const transferId = String(body.transferId);
      const result = await c.commands.closeTransfer.execute(transferId);
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      return result;
    },

    async cancelTransfer(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const transferId = String(body.transferId);
      const dto: { transferId: string; reason?: string | null } = { transferId };
      if (body.reason != null) dto.reason = String(body.reason);
      const result = await c.commands.cancelTransfer.execute(dto);
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      return result;
    },

    async markInTransit(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const transferId = String(body.transferId);
      const result = await c.commands.markInTransit.execute(transferId);
      if (!result.ok) {
        void reply.code(409);
        return result;
      }
      return result;
    },

    async getTransfer(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const result = await c.queries.getTransfer.execute(id);
      if (!result.ok) {
        void reply.code(404);
        return result;
      }
      return result;
    },

    async listTransfers(req: FastifyRequest, _reply: FastifyReply) {
      const q = req.query as Record<string, string | undefined>;
      const query: Record<string, unknown> = {};
      if (q.sourceLocationId) query.sourceLocationId = q.sourceLocationId;
      if (q.destinationLocationId) query.destinationLocationId = q.destinationLocationId;
      if (q.status) query.status = q.status;
      if (q.productId) query.productId = q.productId;
      if (q.inFlightOnly) query.inFlightOnly = q.inFlightOnly === 'true';
      if (q.limit) query.limit = Number(q.limit);
      if (q.offset) query.offset = Number(q.offset);
      return c.queries.listTransfers.execute(query as never);
    },
  };
}
