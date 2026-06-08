import {
  SessionAggregate,
  type SessionStatus,
} from '@oserp-community/iam/domain/aggregates/SessionAggregate';
import { SessionId } from '@oserp-community/iam/domain/value-objects/SessionId';
import { UserId } from '@oserp-community/iam/domain/value-objects/UserId';

export type SessionPersistenceModel = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  lastRefreshedAt: Date;
};

export function sessionToPersistence(session: SessionAggregate): SessionPersistenceModel {
  return {
    id: session.getId().toString(),
    userId: session.getUserId().toString(),
    refreshTokenHash: session.getRefreshTokenHash(),
    status: session.getStatus(),
    createdAt: session.getCreatedAt(),
    expiresAt: session.getExpiresAt(),
    lastRefreshedAt: session.getLastRefreshedAt(),
  };
}

export function sessionToDomain(row: SessionPersistenceModel): SessionAggregate {
  return SessionAggregate.reconstitute({
    id: SessionId.create(row.id),
    userId: UserId.create(row.userId),
    refreshTokenHash: row.refreshTokenHash,
    status: row.status as SessionStatus,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastRefreshedAt: row.lastRefreshedAt,
  });
}
