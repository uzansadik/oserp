/**
 * LocationRef — Bir lokasyona (depo/bölge/raf) referans.
 *
 * MVP'de locationId + opsiyonel path string ("WH-01/A/12").
 * Faz 5'te Warehouse context'ten tam hiyerarşi gelecek.
 */
export class LocationRef {
  private constructor(
    private readonly locationId: string,
    private readonly displayName: string | null,
  ) {}

  static create(locationId: string, displayName?: string | null): LocationRef {
    if (!locationId || locationId.length > 64) {
      throw new Error(`LocationRef: locationId 1-64 karakter olmalı: ${locationId}`);
    }
    const name = displayName ?? null;
    if (name !== null && name.length > 128) {
      throw new Error(`LocationRef: displayName max 128 karakter: ${name}`);
    }
    return new LocationRef(locationId, name);
  }

  static defaultWarehouse(): LocationRef {
    // Faz 5 öncesi: tek bir varsayılan lokasyon
    return new LocationRef('DEFAULT-WH', 'Ana Depo');
  }

  getLocationId(): string { return this.locationId; }
  getDisplayName(): string | null { return this.displayName; }

  equals(other: LocationRef): boolean { return this.locationId === other.locationId; }
  static equals(a: LocationRef, b: LocationRef): boolean { return a.locationId === b.locationId; }
}
