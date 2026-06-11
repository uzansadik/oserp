/**
 * Quantity — Stok seviyesinin dört bileşeni (immutable).
 *
 *   onHand      = fiziksel eldeki miktar
 *   reserved    = sipariş için ayrılmış miktar (Faz 7'de kullanılır)
 *   inTransit   = transfer sırasında "yolda" olan miktar (2-step transfer için)
 *   available   = kullanılabilir miktar = onHand - reserved - inTransit
 *
 * MVP'de reserved ve inTransit 0 kabul edilir; hesap yine doğrulanır.
 *
 * Decimal hassasiyet için string tabanlı sayılar kullanılır; Drizzle
 * `numeric` zaten string döner.
 */
export class Quantity {
  private constructor(
    private readonly onHand: string,
    private readonly reserved: string,
    private readonly inTransit: string,
  ) {}

  static zero(): Quantity {
    return new Quantity('0', '0', '0');
  }

  static create(onHand: string, reserved = '0', inTransit = '0'): Quantity {
    Quantity.assertNonNegative(onHand, 'onHand');
    Quantity.assertNonNegative(reserved, 'reserved');
    Quantity.assertNonNegative(inTransit, 'inTransit');
    const on = Quantity.toBigInt(onHand);
    const res = Quantity.toBigInt(reserved);
    const trn = Quantity.toBigInt(inTransit);
    // available >= 0 invariant: onHand >= reserved + inTransit
    if (on < res + trn) {
      throw new Error(
        `Quantity invariant violated: onHand (${onHand}) < reserved (${reserved}) + inTransit (${inTransit})`,
      );
    }
    return new Quantity(onHand, reserved, inTransit);
  }

  getOnHand(): string { return this.onHand; }
  getReserved(): string { return this.reserved; }
  getInTransit(): string { return this.inTransit; }

  /** onHand - reserved - inTransit */
  getAvailable(): string {
    const on = Quantity.toBigInt(this.onHand);
    const res = Quantity.toBigInt(this.reserved);
    const trn = Quantity.toBigInt(this.inTransit);
    return (on - res - trn).toString();
  }

  /** Pozitif delta uygular (receipt). Negatif delta uygulanamaz — issue için subtract kullan. */
  addOnHand(delta: string): Quantity {
    Quantity.assertNonNegative(delta, 'delta');
    const on = Quantity.toBigInt(this.onHand) + Quantity.toBigInt(delta);
    return new Quantity(on.toString(), this.reserved, this.inTransit);
  }

  /** Negatif delta uygular (issue/scrap). `delta` pozitif verilir, çıkarılır. */
  subtractOnHand(delta: string): Quantity {
    Quantity.assertNonNegative(delta, 'delta');
    const on = Quantity.toBigInt(this.onHand) - Quantity.toBigInt(delta);
    if (on < 0n) {
      throw new Error(
        `Insufficient stock: cannot subtract ${delta} from onHand ${this.onHand}`,
      );
    }
    return new Quantity(on.toString(), this.reserved, this.inTransit);
  }

  /** Transfer 2-step: bir lokasyondan çıkarken inTransit artar, varışta inTransit → onHand. */
  markInTransit(delta: string): Quantity {
    Quantity.assertNonNegative(delta, 'delta');
    const on = Quantity.toBigInt(this.onHand) - Quantity.toBigInt(delta);
    if (on < 0n) {
      throw new Error(`Insufficient stock to mark in-transit: onHand ${this.onHand} < ${delta}`);
    }
    const trn = Quantity.toBigInt(this.inTransit) + Quantity.toBigInt(delta);
    return new Quantity(on.toString(), this.reserved, trn.toString());
  }

  /** inTransit'ten onHand'e aktarım (transfer varışı). */
  receiveInTransit(delta: string): Quantity {
    Quantity.assertNonNegative(delta, 'delta');
    const trn = Quantity.toBigInt(this.inTransit) - Quantity.toBigInt(delta);
    if (trn < 0n) {
      throw new Error(`InTransit yetersiz: ${this.inTransit} < ${delta}`);
    }
    const on = Quantity.toBigInt(this.onHand) + Quantity.toBigInt(delta);
    return new Quantity(on.toString(), this.reserved, trn.toString());
  }

  /**
   * Rezervasyon: `delta` kadar miktar available'tan reserved'e taşınır.
   * onHand değişmez; sadece `available` (onHand-reserved-inTransit) azalır.
   * Yeterli available yoksa hata.
   */
  reserve(delta: string): Quantity {
    Quantity.assertNonNegative(delta, 'delta');
    const d = Quantity.toBigInt(delta);
    const on = Quantity.toBigInt(this.onHand);
    const res = Quantity.toBigInt(this.reserved);
    const trn = Quantity.toBigInt(this.inTransit);
    const newRes = res + d;
    if (newRes + trn > on) {
      throw new Error(
        `Insufficient available stock to reserve: onHand=${this.onHand}, reserved=${this.reserved}, inTransit=${this.inTransit}, requested=${delta}`,
      );
    }
    return new Quantity(this.onHand, newRes.toString(), this.inTransit);
  }

  /**
   * Rezervasyon serbest bırakma: `delta` kadar reserved azalır.
   * Delta, mevcut reserved'ten büyükse hata.
   */
  release(delta: string): Quantity {
    Quantity.assertNonNegative(delta, 'delta');
    const d = Quantity.toBigInt(delta);
    const res = Quantity.toBigInt(this.reserved);
    if (d > res) {
      throw new Error(
        `Cannot release ${delta} from reserved=${this.reserved}`,
      );
    }
    const newRes = res - d;
    return new Quantity(this.onHand, newRes.toString(), this.inTransit);
  }

  /**
   * Rezervasyon commit: `delta` kadar hem onHand hem reserved azalır.
   * Gerçek sevkiyat anında çağrılır.
   */
  commitReservation(delta: string): Quantity {
    Quantity.assertNonNegative(delta, 'delta');
    const d = Quantity.toBigInt(delta);
    const on = Quantity.toBigInt(this.onHand);
    const res = Quantity.toBigInt(this.reserved);
    if (d > on) {
      throw new Error(`Insufficient onHand to commit: ${this.onHand} < ${delta}`);
    }
    if (d > res) {
      throw new Error(`Cannot commit ${delta} from reserved=${this.reserved}`);
    }
    return new Quantity(
      (on - d).toString(),
      (res - d).toString(),
      this.inTransit,
    );
  }

  isZero(): boolean {
    return Quantity.toBigInt(this.onHand) === 0n
      && Quantity.toBigInt(this.reserved) === 0n
      && Quantity.toBigInt(this.inTransit) === 0n;
  }

  equals(other: Quantity): boolean {
    return this.onHand === other.onHand
      && this.reserved === other.reserved
      && this.inTransit === other.inTransit;
  }

  private static assertNonNegative(value: string, field: string): void {
    if (!/^\d+(\.\d+)?$/.test(value)) {
      throw new Error(`${field} must be a non-negative decimal: ${value}`);
    }
  }

  private static toBigInt(value: string): bigint {
    // Ondalık kısmı scale=6 varsayımı ile bigint'e çevir
    if (!value.includes('.')) return BigInt(value);
    const [intPart, decPart = ''] = value.split('.');
    const padded = (decPart ?? '').padEnd(6, '0').slice(0, 6);
    return BigInt(`${intPart}${padded}`);
  }
}
