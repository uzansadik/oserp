/**
 * Lot HTTP routes
 */
import type { FastifyInstance } from 'fastify';
import type { InventoryContainer } from '../../container';
import { makeLotController } from '../controllers/lotController';

export async function registerLotRoutes(
  app: FastifyInstance,
  container: InventoryContainer,
): Promise<void> {
  const ctrl = makeLotController(container);

  app.post('/lots', ctrl.create);
  app.get('/lots', ctrl.list);
  app.get('/lots/:productId/:locationId', ctrl.getAggregate);
  app.post('/lots/dispatch', ctrl.dispatch);
  app.post('/lots/expire', ctrl.expire);
  app.post('/lots/quarantine', ctrl.quarantine);
  app.post('/lots/serials', ctrl.allocateSerials);
}
