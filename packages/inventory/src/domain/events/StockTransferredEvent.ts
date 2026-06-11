import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class StockTransferredEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.StockTransferred;

  constructor(
    public readonly movementId: string,
    public readonly productId: string,
    public readonly fromLocationId: string,
    public readonly toLocationId: string,
    public readonly quantity: string,
    public readonly lotId: string | null,
    occurredOn?: Date,
  ) {
    super(movementId, occurredOn);
  }
}
