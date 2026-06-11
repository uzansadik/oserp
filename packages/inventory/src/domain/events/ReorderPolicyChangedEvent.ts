import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class ReorderPolicyChangedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.ReorderPolicyChanged;

  constructor(
    public readonly productId: string,
    public readonly minQty: string | null,
    public readonly maxQty: string | null,
    public readonly reorderQty: string | null,
    public readonly safetyStock: string | null,
    occurredOn?: Date,
  ) {
    super(productId, occurredOn);
  }
}
