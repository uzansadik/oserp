import 'server-only';
import { eq } from 'drizzle-orm';

import type { BackofficeDb } from './db';
import { type EdgeConfigRow, edgeConfig, type TlsMode } from './schema';

const EDGE_ROW_ID = 1;

export type EdgeConfigUpdate = {
  domain?: string | null;
  tlsMode?: TlsMode;
  acmeEmail?: string | null;
};

export class EdgeConfigRepository {
  constructor(private readonly db: BackofficeDb) {}

  async get(): Promise<EdgeConfigRow> {
    const rows = await this.db
      .select()
      .from(edgeConfig)
      .where(eq(edgeConfig.id, EDGE_ROW_ID))
      .limit(1);
    const existing = rows[0];
    if (existing) return existing;
    // Migration normally seeds id=1; this is a fallback if the row was deleted.
    const inserted = await this.db
      .insert(edgeConfig)
      .values({ id: EDGE_ROW_ID, tlsMode: 'self_signed', updatedAt: new Date() })
      .returning();
    const created = inserted[0];
    if (!created) throw new Error('edge_config seed basarisiz.');
    return created;
  }

  async update(input: EdgeConfigUpdate): Promise<EdgeConfigRow> {
    const current = await this.get();
    const next = {
      domain: input.domain !== undefined ? input.domain : current.domain,
      tlsMode: input.tlsMode ?? current.tlsMode,
      acmeEmail: input.acmeEmail !== undefined ? input.acmeEmail : current.acmeEmail,
      updatedAt: new Date(),
    };
    const updated = await this.db
      .update(edgeConfig)
      .set(next)
      .where(eq(edgeConfig.id, EDGE_ROW_ID))
      .returning();
    const result = updated[0];
    if (!result) throw new Error('edge_config guncellenemedi.');
    return result;
  }
}
