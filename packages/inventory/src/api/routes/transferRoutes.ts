/**
 * Transfer HTTP routes (2-step stock movement between locations)
 */
import type { FastifyInstance } from 'fastify';
import type { InventoryContainer } from '../../container';
import { makeTransferController } from '../controllers/transferController';

export async function registerTransferRoutes(
  app: FastifyInstance,
  container: InventoryContainer,
): Promise<void> {
  const ctrl = makeTransferController(container);

  app.post('/transfers', ctrl.createTransfer);
  app.get('/transfers', ctrl.listTransfers);
  app.get('/transfers/:id', ctrl.getTransfer);
  app.post('/transfers/dispatch', ctrl.dispatchTransfer);
  app.post('/transfers/in-transit', ctrl.markInTransit);
  app.post('/transfers/receive', ctrl.receiveTransfer);
  app.post('/transfers/close', ctrl.closeTransfer);
  app.post('/transfers/cancel', ctrl.cancelTransfer);
}
