import { SessionRefreshedEvent } from '@oserp-community/iam/domain/events/SessionRefreshedEvent';
import { SessionRevokedEvent } from '@oserp-community/iam/domain/events/SessionRevokedEvent';
import { SessionStartedEvent } from '@oserp-community/iam/domain/events/SessionStartedEvent';
import { AggregateRoot } from '../entities/AggregateRoot';
import { SessionId } from '../value-objects/SessionId';
import type { UserId } from '../value-objects/UserId';

export type SessionStatus = 'active' | 'revoked';

export type StartSessionProps = {
  userId: UserId;
  refreshTokenHash: string;
  expiresAt: Date;
};

export type ReconstituteSessionProps = {
  id: SessionId;
  userId: UserId;
  refreshTokenHash: string;
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
  lastRefreshedAt: Date;
};

export class SessionAggregate extends AggregateRoot {
  private constructor(
    private readonly id: SessionId,
    private readonly userId: UserId,
    private refreshTokenHash: string,
    private status: SessionStatus,
    private readonly createdAt: Date,
    private expiresAt: Date,
    private lastRefreshedAt: Date,
  ) {
    super();
  }

  static start(props: StartSessionProps): SessionAggregate {
    if (props.expiresAt.getTime() <= Date.now()) {
      throw new Error('Session expiry must be in the future');
    }

    const now = new Date();
    const session = new SessionAggregate(
      SessionId.generate(),
      props.userId,
      props.refreshTokenHash,
      'active',
      now,
      props.expiresAt,
      now,
    );

    session.addDomainEvent(
      new SessionStartedEvent(session.id.toString(), props.userId.toString(), props.expiresAt),
    );

    return session;
  }

  static reconstitute(props: ReconstituteSessionProps): SessionAggregate {
    return new SessionAggregate(
      props.id,
      props.userId,
      props.refreshTokenHash,
      props.status,
      props.createdAt,
      props.expiresAt,
      props.lastRefreshedAt,
    );
  }

  refresh(newRefreshTokenHash: string, newExpiresAt: Date, now: Date = new Date()): void {
    if (this.status === 'revoked') {
      throw new Error('Cannot refresh a revoked session');
    }
    if (this.isExpired(now)) {
      throw new Error('Cannot refresh an expired session');
    }
    if (newExpiresAt.getTime() <= now.getTime()) {
      throw new Error('Session expiry must be in the future');
    }

    this.refreshTokenHash = newRefreshTokenHash;
    this.expiresAt = newExpiresAt;
    this.lastRefreshedAt = now;
    this.addDomainEvent(new SessionRefreshedEvent(this.id.toString(), newExpiresAt));
  }

  revoke(): void {
    if (this.status === 'revoked') {
      throw new Error('Session is already revoked');
    }
    this.status = 'revoked';
    this.addDomainEvent(new SessionRevokedEvent(this.id.toString()));
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  isActive(now: Date = new Date()): boolean {
    return this.status === 'active' && !this.isExpired(now);
  }

  getId(): SessionId {
    return this.id;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getRefreshTokenHash(): string {
    return this.refreshTokenHash;
  }

  getStatus(): SessionStatus {
    return this.status;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getLastRefreshedAt(): Date {
    return this.lastRefreshedAt;
  }
}
