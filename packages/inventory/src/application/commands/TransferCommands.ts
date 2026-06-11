/**
 * Commands: Transfer
 */
import type {
  CreateTransferDTO,
  DispatchTransferDTO,
  ReceiveTransferDTO,
  CancelTransferDTO,
  TransferView,
} from '../dto/TransferDTOs';

export type CreateTransferCommand = CreateTransferDTO;
export type DispatchTransferCommand = DispatchTransferDTO;
export type ReceiveTransferCommand = ReceiveTransferDTO;
export type CancelTransferCommand = CancelTransferDTO;

export interface TransferResult {
  ok: boolean;
  transfer?: TransferView;
  error?: string;
  /** Dispatch başarısızsa yetersiz kalan miktar. */
  unallocated?: ReadonlyArray<{ productId: string; missing: string }>;
}
