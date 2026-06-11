import type { UuidPort } from '@oserp-community/inventory/application/ports/UuidPort';

/** Test'lerde deterministik/sayaçlı UUID üretir. */
export class FakeUuidGenerator implements UuidPort {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    // Sabit formatta UUID v4-benzeri (sayaçlı)
    const hex = this.counter.toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${hex}`;
  }
}
