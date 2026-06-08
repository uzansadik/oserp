import type { SessionRepositoryPort } from '@oserp-community/iam/application/ports/SessionRepositoryPort';
import type { SessionAggregate } from '@oserp-community/iam/domain/aggregates/SessionAggregate';
import type { SessionId } from '@oserp-community/iam/domain/value-objects/SessionId';
import type { UserId } from '@oserp-community/iam/domain/value-objects/UserId';
import { and, eq, gt } from 'drizzle-orm';
import type { IamDbClient } from '../db';
import { sessionToDomain, sessionToPersistence } from '../mappers/SessionMapper';
import { iamSessions } from '../schemas/iam.session.schema';

export class DrizzleSessionRepository implements SessionRepositoryPort {
  constructor(private readonly db: IamDbClient) {}

  async save(session: SessionAggregate): Promise<void> {
    const data = sessionToPersistence(session);
    await this.db
      .insert(iamSessions)
      .values(data)
      .onConflictDoUpdate({
        target: iamSessions.id,
        set: {
          refreshTokenHash: data.refreshTokenHash,
          status: data.status,
          expiresAt: data.expiresAt,
          lastRefreshedAt: data.lastRefreshedAt,
        },
      });
  }

  async findById(id: SessionId): Promise<SessionAggregate | null> {
    const row = await this.db.query.iamSessions.findFirst({
      where: eq(iamSessions.id, id.toString()),
    });
    return row ? sessionToDomain(row) : null;
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionAggregate | null> {
    const row = await this.db.query.iamSessions.findFirst({
      where: eq(iamSessions.refreshTokenHash, refreshTokenHash),
    });
    return row ? sessionToDomain(row) : null;
  }

  async findActiveByUser(userId: UserId): Promise<SessionAggregate[]> {
    const rows = await this.db.query.iamSessions.findMany({
      where: and(
        eq(iamSessions.userId, userId.toString()),
        eq(iamSessions.status, 'active'),
        gt(iamSessions.expiresAt, new Date()),
      ),
    });
    return rows.map(sessionToDomain);
  }
}
