import type { FastifyInstance } from 'fastify';
import type { InventoryContainer } from '../../container';
import { registerProductRoutes } from './productRoutes';
import { registerStockRoutes } from './stockRoutes';
import { registerPriceListRoutes } from './priceListRoutes';

/**
 * Fastify plugin: tüm inventory route'larını mount eder.
 * `apps/api` bunu `/inventory` prefix'i ile çağırır.
 */
export async function inventoryRouter(
  app: FastifyInstance,
  opts: { container: InventoryContainer },
): Promise<void> {
  await registerProductRoutes(app, opts.container);
  await registerStockRoutes(app, opts.container);
  await registerPriceListRoutes(app, opts.container);
}
