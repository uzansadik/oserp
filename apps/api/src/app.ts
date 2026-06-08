import { createIamContainer, createIamDb } from '@oserp-community/iam';
import { iamRouter } from '@oserp-community/iam/api';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config';

/**
 * IAM container'ını kurar, Fastify örneğini oluşturur ve `iamRouter`'ı `/iam`
 * ön ekiyle mount eder. Dinlemeyi başlatmaz; bu `server.ts`'in sorumluluğudur.
 */
export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const db = createIamDb(config.databaseUrl);
  const container = createIamContainer({
    db,
    jwtSecret: config.jwtSecret,
    ...(config.jwtIssuer !== undefined ? { jwtIssuer: config.jwtIssuer } : {}),
  });

  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
  });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  await app.register(iamRouter, { container, prefix: '/iam' });

  return app;
}
