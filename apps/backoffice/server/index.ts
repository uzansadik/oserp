import 'server-only';
import { getDb } from './db';
import { AdminUsersRepository } from './admin-users-repository';
import { ServicesRepository } from './services-repository';

export type BackofficeContext = {
  adminUsers: AdminUsersRepository;
  services: ServicesRepository;
};

export async function getContext(): Promise<BackofficeContext> {
  const db = await getDb();
  return {
    adminUsers: new AdminUsersRepository(db),
    services: new ServicesRepository(db),
  };
}

export { AdminUsersRepository } from './admin-users-repository';
export { ServicesRepository } from './services-repository';
export { resolveDbPath } from './db';
