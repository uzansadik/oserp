import 'server-only';
import { desc, eq } from 'drizzle-orm';

import type { BackofficeDb } from './db';
import {
  type NewServiceEventRow,
  type NewServiceRow,
  type ServiceEventRow,
  type ServiceRow,
  type ServiceStatus,
  serviceEvents,
  services,
  type TlsMode,
} from './schema';

export class ServicesRepository {
  constructor(private readonly db: BackofficeDb) {}

  async list(): Promise<ServiceRow[]> {
    return this.db.select().from(services);
  }

  async findByName(name: string): Promise<ServiceRow | null> {
    const rows = await this.db.select().from(services).where(eq(services.name, name)).limit(1);
    return rows[0] ?? null;
  }

  async upsert(row: NewServiceRow): Promise<ServiceRow> {
    const inserted = await this.db
      .insert(services)
      .values(row)
      .onConflictDoUpdate({
        target: services.name,
        set: {
          image: row.image,
          currentTag: row.currentTag,
          status: row.status,
          lastStartedAt: row.lastStartedAt ?? null,
          ...(row.envJson !== undefined ? { envJson: row.envJson } : {}),
        },
      })
      .returning();
    const result = inserted[0];
    if (!result) {
      throw new Error('ServicesRepository.upsert: insert returned no row');
    }
    return result;
  }

  async updateStatus(name: string, status: ServiceStatus, lastStartedAt?: Date): Promise<void> {
    await this.db
      .update(services)
      .set({
        status,
        ...(lastStartedAt !== undefined ? { lastStartedAt } : {}),
      })
      .where(eq(services.name, name));
  }

  async saveEnv(name: string, env: Record<string, string>): Promise<void> {
    await this.db
      .update(services)
      .set({ envJson: JSON.stringify(env) })
      .where(eq(services.name, name));
  }

  async getEnv(name: string): Promise<Record<string, string>> {
    const row = await this.findByName(name);
    if (!row) return {};
    try {
      const parsed = JSON.parse(row.envJson) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      return {};
    } catch {
      return {};
    }
  }

  async remove(name: string): Promise<void> {
    await this.db.delete(services).where(eq(services.name, name));
  }

  async setDomain(
    name: string,
    input: { domain: string | null; tlsMode: TlsMode; upstreamPort?: number | null },
  ): Promise<void> {
    await this.db
      .update(services)
      .set({
        domain: input.domain,
        tlsMode: input.tlsMode,
        ...(input.upstreamPort !== undefined ? { upstreamPort: input.upstreamPort } : {}),
      })
      .where(eq(services.name, name));
  }

  async setUpstreamPort(name: string, port: number | null): Promise<void> {
    await this.db.update(services).set({ upstreamPort: port }).where(eq(services.name, name));
  }

  async recordEvent(
    input: Pick<NewServiceEventRow, 'serviceName' | 'kind' | 'payloadJson'>,
  ): Promise<void> {
    await this.db.insert(serviceEvents).values(input);
  }

  async listEvents(serviceName: string, limit = 50): Promise<ServiceEventRow[]> {
    return this.db
      .select()
      .from(serviceEvents)
      .where(eq(serviceEvents.serviceName, serviceName))
      .orderBy(desc(serviceEvents.at))
      .limit(limit);
  }
}
