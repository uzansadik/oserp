import type IDomainEvent from '../../interfaces/IDomainEvent';

/**
 * StockProjectionService — Stock* event'lerini dinleyip ilgili InventoryLevel'i
 * günceller. StockMovement ve InventoryLevel aggregate'lerinin eventual
 * consistency köprüsü. Aynı transaction'da DEĞİLDİR; event outbox'tan publish
 * edildikten sonra ayrı bir işlem olarak çalışır.
 */
export interface StockProjectionService {
  /** Outbox publisher'dan gelen bir veya birden fazla event'i uygular. */
  applyEvents(events: ReadonlyArray<IDomainEvent>): Promise<void>;
}
