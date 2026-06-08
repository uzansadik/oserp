import 'server-only';
import { eq } from 'drizzle-orm';

import type { BackofficeDb } from './db';
import { adminUsers, type AdminUserRow, type NewAdminUserRow } from './schema';

export class AdminUsersRepository {
  constructor(private readonly db: BackofficeDb) {}

  async count(): Promise<number> {
    const rows = await this.db.select({ id: adminUsers.id }).from(adminUsers);
    return rows.length;
  }

  async findByEmail(email: string): Promise<AdminUserRow | null> {
    const rows = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: number): Promise<AdminUserRow | null> {
    const rows = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async create(input: Pick<NewAdminUserRow, 'email' | 'passwordHash'>): Promise<AdminUserRow> {
    const inserted = await this.db
      .insert(adminUsers)
      .values({ email: input.email, passwordHash: input.passwordHash })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error('AdminUsersRepository.create: insert returned no row');
    }
    return row;
  }
}
