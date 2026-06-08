import type { SessionAggregate } from '../../domain/aggregates/SessionAggregate';
import type { SessionId } from '../../domain/value-objects/SessionId';
import type { UserId } from '../../domain/value-objects/UserId';

export interface SessionRepositoryPort {
  save(session: SessionAggregate): Promise<void>;

  findById(id: SessionId): Promise<SessionAggregate | null>;

  findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionAggregate | null>;

  findActiveByUser(userId: UserId): Promise<SessionAggregate[]>;
}
