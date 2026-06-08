import type { UuidPort } from '@oserp-community/iam/application/ports/UuidPort';
import { randomUUID } from 'crypto';

/** Node `crypto.randomUUID` tabanlı UUID üretici. */
export class CryptoUuidGenerator implements UuidPort {
  generate(): string {
    return randomUUID();
  }
}
