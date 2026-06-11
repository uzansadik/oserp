import { InventoryLevel } from '../../domain/entities/InventoryLevel';
import { ProductId } from '../../domain/value-objects/ProductId';
import { LocationRef } from '../../domain/value-objects/LocationRef';
import { LotRef } from '../../domain/value-objects/LotRef';
import { StockReceivedEvent } from '../../domain/events/StockReceivedEvent';
import { StockIssuedEvent } from '../../domain/events/StockIssuedEvent';
import { StockTransferredEvent } from '../../domain/events/StockTransferredEvent';
import { StockAdjustedEvent } from '../../domain/events/StockAdjustedEvent';
import { StockScrappedEvent } from '../../domain/events/StockScrappedEvent';
import { StockLevelChangedEvent } from '../../domain/events/StockLevelChangedEvent';
import type IDomainEvent from '../../interfaces/IDomainEvent';
import type { InventoryLevelRepositoryPort } from '../ports/InventoryLevelRepositoryPort';
import type { StockProjectionService } from '../ports/StockProjectionServicePort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';

/**
 * Stock* event'lerini dinler ve ilgili InventoryLevel aggregate'ini günceller.
 * Aynı transaction içinde çalışmaz; OutboxPublisher tarafından drene edilen
 * event'ler için ayrı bir uow.execute ile yazılır.
 *
 * StockLevelChanged event'leri bu servis tarafından ÜRETİLİR (InventoryLevel
 * mutasyonları sonrası) ve outbox'a yazılır; başka subscriber'lar bu event'leri
 * kullanabilir (örn. notification service).
 */
export class StockProjectionServiceImpl implements StockProjectionService {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly levels: InventoryLevelRepositoryPort,
  ) {}

  async applyEvents(events: ReadonlyArray<IDomainEvent>): Promise<void> {
    for (const event of events) {
      if (event instanceof StockReceivedEvent) {
        await this.handleReceipt(event);
      } else if (event instanceof StockIssuedEvent) {
        await this.handleIssue(event);
      } else if (event instanceof StockTransferredEvent) {
        await this.handleTransfer(event);
      } else if (event instanceof StockAdjustedEvent) {
        await this.handleAdjustment(event);
      } else if (event instanceof StockScrappedEvent) {
        await this.handleScrap(event);
      } else if (event instanceof StockLevelChangedEvent) {
        // recursive: bu event'ler başka servisler için; kendimiz yazıyoruz
        continue;
      }
    }
  }

  private async handleReceipt(e: StockReceivedEvent): Promise<void> {
    await this.uow.execute(async (ctx) => {
      const level = await this.findOrCreateLevel(
        ProductId.create(e.productId),
        LocationRef.create(e.locationId),
        e.lotId ? LotRef.create(e.lotId) : null,
        ctx,
      );
      level.applyReceipt(e.quantity);
      await ctx.inventoryLevels.update(level);
      // StockLevelChanged event'i yaz (subscriber'lar için)
      await ctx.outbox.enqueue(level.pullDomainEvents());
    });
  }

  private async handleIssue(e: StockIssuedEvent): Promise<void> {
    await this.uow.execute(async (ctx) => {
      const level = await this.findOrCreateLevel(
        ProductId.create(e.productId),
        LocationRef.create(e.locationId),
        e.lotId ? LotRef.create(e.lotId) : null,
        ctx,
      );
      level.applyIssue(e.quantity);
      await ctx.inventoryLevels.update(level);
      await ctx.outbox.enqueue(level.pullDomainEvents());
    });
  }

  private async handleTransfer(e: StockTransferredEvent): Promise<void> {
    // 2-step: source'tan out+inTransit, target'a henüz bir şey yazılmaz
    // (gönderici iç transfer'i kendi outbox'ı üzerinden publish eder).
    // Burada sadece source'u güncelliyoruz; varış ayrı bir RECEIPT gibi işlenir.
    await this.uow.execute(async (ctx) => {
      const source = await this.findOrCreateLevel(
        ProductId.create(e.productId),
        LocationRef.create(e.fromLocationId),
        e.lotId ? LotRef.create(e.lotId) : null,
        ctx,
      );
      source.applyTransferOut(e.quantity);
      await ctx.inventoryLevels.update(source);
      await ctx.outbox.enqueue(source.pullDomainEvents());
    });
    // Target'ı oluşturmayız burada; karşı taraftan bir RECEIPT event'i gelince
    // applyTransferIn çağrılır. (MVP'de transfer tek adım; ileride 2-step yapılacak.)
  }

  private async handleAdjustment(e: StockAdjustedEvent): Promise<void> {
    // Quantity string'inde "+" veya "-" prefix'i ile yön belirlenir (MVP).
    // Daha temiz: ayrı alan; ama MVP için bu yeterli.
    const isPositive = !e.quantity.startsWith('-');
    const absQty = isPositive ? e.quantity.replace(/^\+/, '') : e.quantity.slice(1);

    await this.uow.execute(async (ctx) => {
      const level = await this.findOrCreateLevel(
        ProductId.create(e.productId),
        LocationRef.create(e.locationId),
        null,
        ctx,
      );
      if (isPositive) {
        level.applyAdjustmentPositive(absQty);
      } else {
        level.applyAdjustmentNegative(absQty);
      }
      await ctx.inventoryLevels.update(level);
      await ctx.outbox.enqueue(level.pullDomainEvents());
    });
  }

  private async handleScrap(e: StockScrappedEvent): Promise<void> {
    await this.uow.execute(async (ctx) => {
      const level = await this.findOrCreateLevel(
        ProductId.create(e.productId),
        LocationRef.create(e.locationId),
        null,
        ctx,
      );
      level.applyScrap(e.quantity);
      await ctx.inventoryLevels.update(level);
      await ctx.outbox.enqueue(level.pullDomainEvents());
    });
  }

  private async findOrCreateLevel(
    productId: ProductId,
    location: LocationRef,
    lotRef: LotRef | null,
    ctx: { inventoryLevels: InventoryLevelRepositoryPort },
  ): Promise<InventoryLevel> {
    const existing = await ctx.inventoryLevels.findByComposite(productId, location, lotRef);
    if (existing) return existing;
    const created = InventoryLevel.create({ productId, location, lotRef });
    await ctx.inventoryLevels.save(created);
    return created;
  }
}
