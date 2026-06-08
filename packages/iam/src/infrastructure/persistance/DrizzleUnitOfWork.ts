import type {
  UnitOfWorkContext,
  UnitOfWorkPort,
} from '@oserp-community/iam/application/ports/UnitOfWorkPort';
import { DrizzleOutbox } from './DrizzleOutbox';
import type { IamDb, IamDbClient } from './db';
import { DrizzleApiCredentialRepository } from './repositories/DrizzleApiCredentialRepository';
import { DrizzleMembershipRepository } from './repositories/DrizzleMembershipRepository';
import { DrizzlePermissionRepository } from './repositories/DrizzlePermissionRepository';
import { DrizzleRoleRepository } from './repositories/DrizzleRoleRepository';
import { DrizzleSessionRepository } from './repositories/DrizzleSessionRepository';
import { DrizzleUserCredentialRepository } from './repositories/DrizzleUserCredentialRepository';
import { DrizzleUserRepository } from './repositories/DrizzleUserRepository';

function buildContext(client: IamDbClient): UnitOfWorkContext {
  return {
    users: new DrizzleUserRepository(client),
    userCredentials: new DrizzleUserCredentialRepository(client),
    roles: new DrizzleRoleRepository(client),
    permissions: new DrizzlePermissionRepository(client),
    memberships: new DrizzleMembershipRepository(client),
    sessions: new DrizzleSessionRepository(client),
    apiCredentials: new DrizzleApiCredentialRepository(client),
    outbox: new DrizzleOutbox(client),
  };
}

/**
 * Tüm aggregate kayıtlarını ve outbox yazımlarını tek bir veritabanı
 * transaction'ında çalıştıran UnitOfWork. `work` başarıyla dönerse commit,
 * hata fırlatırsa rollback yapılır.
 */
export class DrizzleUnitOfWork implements UnitOfWorkPort {
  constructor(private readonly db: IamDb) {}

  async execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      return work(buildContext(tx));
    });
  }
}
