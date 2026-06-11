import { createIamContainer, createIamDb } from '@oserp-community/iam';
import { iamRouter } from '@oserp-community/iam/api';
import { createInventoryContainer, createInventoryDb } from '@oserp-community/inventory';
import { inventoryRouter } from '@oserp-community/inventory/api';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config';

/**
 * IAM + Inventory container'larını kurar, Fastify örneğini oluşturur ve
 * her iki router'ı uygun prefix ile mount eder. Dinlemeyi başlatmaz; bu
 * `server.ts`'in sorumluluğudur.
 *
 * Her context kendi `db` instance'ını oluşturur (Drizzle schema tipleri
 * paketler arası çakışamaz); arka plandaki Postgres bağlantısı aynı
 * `databaseUrl` üzerinden yapılır.
 */
export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const iamDb = createIamDb(config.databaseUrl);
  const inventoryDb = createInventoryDb(config.databaseUrl);

  const iamContainer = createIamContainer({
    db: iamDb,
    jwtSecret: config.jwtSecret,
    ...(config.jwtIssuer !== undefined ? { jwtIssuer: config.jwtIssuer } : {}),
  });
  const inventoryContainer = createInventoryContainer({ db: inventoryDb });

  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
  });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  await app.register(iamRouter, { container: iamContainer, prefix: '/iam' });
  await app.register(inventoryRouter, { container: inventoryContainer, prefix: '/inventory' });

  return app;
}
