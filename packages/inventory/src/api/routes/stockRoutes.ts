import type { FastifyInstance } from 'fastify';
import {
  postAdjustmentSchema,
  postIssueSchema,
  postReceiptSchema,
  postScrapSchema,
  postTransferSchema,
} from '../../application/commands/StockMovementCommands';
import {
  getStockLevelSchema,
  getStockMovementsSchema,
  getStockValuationSchema,
  listLowStockSchema,
} from '../../application/queries/StockQueries';
import type { InventoryContainer } from '../../container';
import { createStockController } from '../controllers/stockController';
import { mapErrorToHttp } from '../errors/httpErrorMapper';

export async function registerStockRoutes(
  app: FastifyInstance,
  container: InventoryContainer,
): Promise<void> {
  const controller = createStockController(container);

  // ── Post movement endpoints ──
  app.post('/movements/receipts', async (request, reply) => {
    await run(reply, () => controller.postReceipt(postReceiptSchema.parse(request.body)));
  });
  app.post('/movements/issues', async (request, reply) => {
    await run(reply, () => controller.postIssue(postIssueSchema.parse(request.body)));
  });
  app.post('/movements/transfers', async (request, reply) => {
    await run(reply, () => controller.postTransfer(postTransferSchema.parse(request.body)));
  });
  app.post('/movements/adjustments', async (request, reply) => {
    await run(reply, () => controller.postAdjustment(postAdjustmentSchema.parse(request.body)));
  });
  app.post('/movements/scraps', async (request, reply) => {
    await run(reply, () => controller.postScrap(postScrapSchema.parse(request.body)));
  });

  // ── Query endpoints ──
  app.get('/movements', async (request, reply) => {
    await run(reply, () => controller.getStockMovements(getStockMovementsSchema.parse(request.query)));
  });

  app.get('/stock/level', async (request, reply) => {
    await run(reply, () => controller.getStockLevel(getStockLevelSchema.parse(request.query)));
  });

  app.get('/stock/low-stock', async (request, reply) => {
    await run(reply, () => controller.listLowStock(listLowStockSchema.parse(request.query)));
  });

  app.get('/stock/valuation', async (request, reply) => {
    await run(reply, () => controller.getStockValuation(getStockValuationSchema.parse(request.query)));
  });
}

async function run(
  reply: import('fastify').FastifyReply,
  fn: () => Promise<{ statusCode: number; body: unknown }>,
): Promise<void> {
  try {
    const result = await fn();
    if (result.statusCode === 204) {
      await reply.code(204).send();
    } else {
      await reply.code(result.statusCode).send(result.body);
    }
  } catch (err) {
    const mapped = mapErrorToHttp(err);
    await reply.code(mapped.statusCode).send(mapped.body);
  }
}
