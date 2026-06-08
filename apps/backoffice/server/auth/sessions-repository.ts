import 'server-only';
import { and, eq, gt, lt } from 'drizzle-orm';

import type { BackofficeDb } from '../db';
import { sessions, type SessionRow } from '../schema';

export class SessionsRepository {
  constructor(private readonly db: BackofficeDb) {}

  async create(input: { token: string; userId: number; expiresAt: Date }): Promise<SessionRow> {
    const inserted = await this.db
      .insert(sessions)
      .values({
        token: input.token,
        userId: input.userId,
        expiresAt: input.expiresAt,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error('SessionsRepository.create: insert returned no row');
    }
    return row;
  }

  async findActiveByToken(token: string, now: Date): Promise<SessionRow | null> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
      .limit(1);
    return rows[0] ?? null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteByUserId(userId: number): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async deleteExpired(now: Date): Promise<void> {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, now));
  }
}
