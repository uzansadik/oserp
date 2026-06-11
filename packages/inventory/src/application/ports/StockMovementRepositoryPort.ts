import type { StockMovement } from '../../domain/entities/StockMovement';
import type { MovementId } from '../../domain/value-objects/MovementId';
import type { MovementTypeVO } from '../../domain/value-objects/MovementType';

export type ListMovementsFilter = {
  productId?: string;
  type?: MovementTypeVO;
  fromLocationId?: string;
  toLocationId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export type ListMovementsResult = {
  movements: ReadonlyArray<StockMovement>;
  total: number;
};

export interface StockMovementRepositoryPort {
  save(movement: StockMovement): Promise<void>;
  findById(id: MovementId): Promise<StockMovement | null>;
  list(filter: ListMovementsFilter): Promise<ListMovementsResult>;
}
