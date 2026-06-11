/**
 * Port: TransferRepository
 *
 * TransferOrder aggregate'ı için kalıcılık soyutlaması.
 * Implementations: InMemoryTransferRepository, DrizzleTransferRepository.
 */
import { TransferOrder } from '../../domain/aggregates/TransferOrder';
import { TransferId } from '../../domain/value-objects/TransferId';

export interface TransferSearchCriteria {
  sourceLocationId?: string;
  destinationLocationId?: string;
  status?: string;
  productId?: string;
  /** Sadece aktif olanlar (DISPATCHED + IN_TRANSIT + RECEIVED). */
  inFlightOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface TransferRepository {
  save(transfer: TransferOrder): Promise<void>;
  update(transfer: TransferOrder): Promise<void>;
  findById(id: TransferId): Promise<TransferOrder | null>;
  findByTransferNumber(transferNumber: string): Promise<TransferOrder | null>;
  search(criteria: TransferSearchCriteria): Promise<ReadonlyArray<TransferOrder>>;
  nextTransferNumber(): Promise<string>;
}
