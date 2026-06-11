import type { UuidPort } from '@oserp-community/inventory/application/ports/UuidPort';
import { randomUUID } from 'crypto';

/** Node `crypto.randomUUID` tabanlı UUID üretici. */
export class CryptoUuidGenerator implements UuidPort {
  generate(): string {
    return randomUUID();
  }
}
