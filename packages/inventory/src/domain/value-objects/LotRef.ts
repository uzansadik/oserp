/**
 * LotRef — Bir lot/seriye referans.
 * Faz 4'te tam Lot aggregate'i olacak; Faz 2'de sadece string ref.
 */
export class LotRef {
  private constructor(private readonly lotId: string) {}

  static create(lotId: string): LotRef {
    if (!lotId || lotId.length > 64) {
      throw new Error(`LotRef: lotId 1-64 karakter olmalı: ${lotId}`);
    }
    return new LotRef(lotId);
  }

  getLotId(): string { return this.lotId; }
  equals(other: LotRef): boolean { return this.lotId === other.lotId; }
  static equals(a: LotRef, b: LotRef): boolean { return a.lotId === b.lotId; }
}
