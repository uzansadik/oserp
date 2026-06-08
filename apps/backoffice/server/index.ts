import 'server-only';
import { getDb } from './db';
import { AdminUsersRepository } from './admin-users-repository';
import { ServicesRepository } from './services-repository';
import { SessionsRepository } from './auth/sessions-repository';

export type BackofficeContext = {
  adminUsers: AdminUsersRepository;
  services: ServicesRepository;
  sessions: SessionsRepository;
};

export async function getContext(): Promise<BackofficeContext> {
  const db = await getDb();
  return {
    adminUsers: new AdminUsersRepository(db),
    services: new ServicesRepository(db),
    sessions: new SessionsRepository(db),
  };
}

export { AdminUsersRepository } from './admin-users-repository';
export { ServicesRepository } from './services-repository';
export { SessionsRepository } from './auth/sessions-repository';
export { resolveDbPath } from './db';
