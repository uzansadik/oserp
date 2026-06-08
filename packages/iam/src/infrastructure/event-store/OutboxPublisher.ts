import type { EventBusPort } from '@oserp-community/iam/application/ports/EventBusPort';
import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';
import { and, asc, eq, lte } from 'drizzle-orm';
import type { IamDb } from '../persistance/db';
import { iamOutbox } from '../persistance/schemas/iam.outbox.schema';

export type OutboxPublisherConfig = {
  /** Her drenajda işlenecek maksimum kayıt sayısı. Varsayılan 100. */
  batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 100;

/**
 * Transactional Outbox'taki yayınlanmamış kayıtları okuyup event bus'a
 * yayan publisher. Her kaydı yayınladıktan sonra `published=true` işaretler.
 * KafkaJS entegrasyonu, `bus` yerine bir Kafka producer adapter'ı geçirilerek
 * bu sınıfı değiştirmeden yapılabilir.
 */
export class OutboxPublisher {
  private readonly batchSize: number;

  constructor(
    private readonly db: IamDb,
    private readonly bus: EventBusPort,
    config: OutboxPublisherConfig = {},
  ) {
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  /**
   * Yayınlanmamış outbox kayıtlarını drene eder. İşlenen kayıt sayısını döner.
   */
  async publishPending(now: Date = new Date()): Promise<number> {
    const rows = await this.db.query.iamOutbox.findMany({
      where: and(eq(iamOutbox.published, false), lte(iamOutbox.occurredOn, now)),
      orderBy: asc(iamOutbox.occurredOn),
      limit: this.batchSize,
    });

    for (const row of rows) {
      const event = this.deserialize(row);
      await this.bus.publish(event);
      await this.db
        .update(iamOutbox)
        .set({ published: true, publishedAt: now })
        .where(eq(iamOutbox.id, row.id));
    }

    return rows.length;
  }

  private deserialize(row: typeof iamOutbox.$inferSelect): IDomainEvent {
    const payload = JSON.parse(row.payload) as Record<string, unknown>;
    return {
      ...payload,
      eventName: row.eventName,
      aggregateId: row.aggregateId,
      occurredOn: row.occurredOn,
    } as IDomainEvent;
  }
}
