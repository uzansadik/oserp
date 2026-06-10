import 'server-only';
import { AdminUsersRepository } from './admin-users-repository';
import { SessionsRepository } from './auth/sessions-repository';
import { getDb } from './db';
import { EdgeConfigRepository } from './edge-config-repository';
import { ServicesRepository } from './services-repository';

export type BackofficeContext = {
  adminUsers: AdminUsersRepository;
  services: ServicesRepository;
  sessions: SessionsRepository;
  edgeConfig: EdgeConfigRepository;
};

export async function getContext(): Promise<BackofficeContext> {
  const db = await getDb();
  return {
    adminUsers: new AdminUsersRepository(db),
    services: new ServicesRepository(db),
    sessions: new SessionsRepository(db),
    edgeConfig: new EdgeConfigRepository(db),
  };
}

export { AdminUsersRepository } from './admin-users-repository';
export { SessionsRepository } from './auth/sessions-repository';
export { resolveDbPath } from './db';
export { EdgeConfigRepository } from './edge-config-repository';
export { ServicesRepository } from './services-repository';
