/**
 * ExpiryDate Value Object
 *
 * Optional expiry date for a lot. Encapsulates:
 *   - The date itself
 *   - daysUntilExpiry() calculation
 *   - isExpiredAt(at) check
 *
 * A lot can be created without an expiry (e.g. screws, paper). In that case
 * use ExpiryDate.none(). FEFO treats lots with no expiry as "lowest priority"
 * (dispatched last), so we use a very far-future date for sorting.
 */
const FAR_FUTURE_YEARS = 100;

export class ExpiryDate {
  private constructor(private readonly date: Date | null) {
    Object.freeze(this);
  }

  static of(date: Date): ExpiryDate {
    return new ExpiryDate(new Date(date.getTime()));
  }

  static none(): ExpiryDate {
    return new ExpiryDate(null);
  }

  static fromISO(iso: string | null | undefined): ExpiryDate {
    if (!iso) return ExpiryDate.none();
    return new ExpiryDate(new Date(iso));
  }

  getDate(): Date | null {
    return this.date ? new Date(this.date.getTime()) : null;
  }

  hasExpiry(): boolean {
    return this.date !== null;
  }

  isExpiredAt(at: Date): boolean {
    if (!this.date) return false;
    return at >= this.date;
  }

  daysUntilExpiry(at: Date): number | null {
    if (!this.date) return null;
    const diff = this.date.getTime() - at.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Sort key for FEFO: earlier expiry = smaller key (sorts first).
   * No-expiry lots get a far-future key so they sort last.
   */
  sortKey(): number {
    if (!this.date) {
      return Date.now() + FAR_FUTURE_YEARS * 365 * 24 * 60 * 60 * 1000;
    }
    return this.date.getTime();
  }

  equals(other: ExpiryDate): boolean {
    if (!(other instanceof ExpiryDate)) return false;
    if (!this.date && !other.date) return true;
    if (!this.date || !other.date) return false;
    return this.date.getTime() === other.date.getTime();
  }

  toString(): string {
    return this.date ? this.date.toISOString().slice(0, 10) : 'NO_EXPIRY';
  }

  toJSON(): string | null {
    return this.date ? this.date.toISOString() : null;
  }
}
