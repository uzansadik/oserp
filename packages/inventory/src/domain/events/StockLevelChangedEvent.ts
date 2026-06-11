import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class StockLevelChangedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.StockLevelChanged;

  constructor(
    public readonly productId: string,
    public readonly locationId: string,
    public readonly onHand: string,
    public readonly available: string,
    public readonly reorderStatus: string,
    occurredOn?: Date,
  ) {
    super(productId, occurredOn);
  }
}
