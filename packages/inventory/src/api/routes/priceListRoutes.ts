/**
 * PriceList HTTP routes
 */
import type { FastifyInstance } from 'fastify';
import type { InventoryContainer } from '../../container';
import { makePriceListController } from '../controllers/priceListController';

export async function registerPriceListRoutes(
  app: FastifyInstance,
  container: InventoryContainer,
): Promise<void> {
  const ctrl = makePriceListController(container);

  app.post('/price-lists', ctrl.create);
  app.get('/price-lists', ctrl.list);
  app.get('/price-lists/:id', ctrl.getById);
  app.post('/price-lists/:id/activate', ctrl.activate);
  app.post('/price-lists/:id/archive', ctrl.archive);
  app.post('/price-lists/entries', ctrl.addEntry);
  app.put('/price-lists/entries', ctrl.updateEntry);
  app.post('/pricing/calculate', ctrl.calculate);
  app.post('/fx/rates', ctrl.setFx);
}
