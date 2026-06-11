/**
 * Queries: Transfer
 */
import type { TransferView } from '../dto/TransferDTOs';

export interface ListTransfersQuery {
  sourceLocationId?: string;
  destinationLocationId?: string;
  status?: string;
  productId?: string;
  inFlightOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface TransferListResult {
  ok: boolean;
  transfers?: ReadonlyArray<TransferView>;
  total?: number;
  error?: string;
}
