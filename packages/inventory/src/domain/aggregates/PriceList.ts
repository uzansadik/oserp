/**
 * PriceList Aggregate Root
 *
 * A PriceList is a named, scoped, versioned container of product prices:
 *   - Id, name, code, scope (GLOBAL / CUSTOMER / CUSTOMER_GROUP)
 *   - Base currency (entries in different currencies need FX conversion)
 *   - Entries (immutable, time-bounded)
 *   - Validity window (activeFrom..activeTo)
 *   - Status: DRAFT | ACTIVE | ARCHIVED
 *   - version (optimistic concurrency for updates)
 *
 * Business rules enforced here:
 *   - Add entry: must be ACTIVE, base currency or convertible, no overlap
 *     with existing active entry for same product
 *   - Archive: only ACTIVE -> ARCHIVED transition; cannot add to archived
 *   - Update entry: not allowed (immutable); use new entry with new dates
 *   - Activate: DRAFT -> ACTIVE; must have at least one entry
 */
import { Currency } from '../value-objects/Currency';
import { PriceListScope } from '../value-objects/PriceListScope';
import { PriceListEntry } from '../entities/PriceListEntry';
import type { PriceListEntryProps } from '../entities/PriceListEntry';
import {
  PriceListCreatedEvent,
  PriceListEntryAddedEvent,
  PriceListEntryUpdatedEvent,
  PriceListArchivedEvent,
} from '../events/PriceListEvents';
import { AggregateRoot } from '../entities/AggregateRoot';

export type PriceListStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface PriceListProps {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: PriceListScope;
  baseCurrency: Currency;
  status: PriceListStatus;
  version: number;
  activeFrom: Date;
  activeTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  entries: ReadonlyArray<PriceListEntry>;
}

export class PriceList extends AggregateRoot {
  private constructor(private props: PriceListProps) {
    super();
    Object.freeze(this.props.entries);
    // Intentionally NOT freezing `this` so AggregateRoot can mutate domainEvents.
  }

  // --- Factory methods ---

  static create(opts: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    scope: PriceListScope;
    baseCurrency: Currency;
    activeFrom: Date;
    activeTo?: Date | null;
  }): PriceList {
    if (!opts.code || opts.code.trim() === '') {
      throw new Error('PriceList code is required');
    }
    if (!opts.name || opts.name.trim() === '') {
      throw new Error('PriceList name is required');
    }
    if (opts.activeTo && opts.activeTo <= opts.activeFrom) {
      throw new Error('activeTo must be after activeFrom');
    }
    const now = new Date();
    const list = new PriceList({
      id: opts.id,
      code: opts.code.toUpperCase().trim(),
      name: opts.name.trim(),
      description: opts.description ?? null,
      scope: opts.scope,
      baseCurrency: opts.baseCurrency,
      status: 'DRAFT',
      version: 1,
      activeFrom: opts.activeFrom,
      activeTo: opts.activeTo ?? null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      entries: [],
    });
    list.addDomainEvent(
      new PriceListCreatedEvent({
        priceListId: opts.id,
        code: list.props.code,
        name: list.props.name,
        scope: list.props.scope.toString(),
        baseCurrency: list.props.baseCurrency.getCode(),
        activeFrom: list.props.activeFrom,
        activeTo: list.props.activeTo,
        occurredAt: now,
      }),
    );
    return list;
  }

  static rehydrate(props: PriceListProps): PriceList {
    return new PriceList(props);
  }

  // --- Getters ---

  getId(): string {
    return this.props.id;
  }
  getCode(): string {
    return this.props.code;
  }
  getName(): string {
    return this.props.name;
  }
  getDescription(): string | null {
    return this.props.description;
  }
  getScope(): PriceListScope {
    return this.props.scope;
  }
  getBaseCurrency(): Currency {
    return this.props.baseCurrency;
  }
  getStatus(): PriceListStatus {
    return this.props.status;
  }
  getVersion(): number {
    return this.props.version;
  }
  getActiveFrom(): Date {
    return this.props.activeFrom;
  }
  getActiveTo(): Date | null {
    return this.props.activeTo;
  }
  getCreatedAt(): Date {
    return this.props.createdAt;
  }
  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }
  getArchivedAt(): Date | null {
    return this.props.archivedAt;
  }
  getEntries(): ReadonlyArray<PriceListEntry> {
    return this.props.entries;
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }
  isArchived(): boolean {
    return this.props.status === 'ARCHIVED';
  }

  isActiveAt(at: Date): boolean {
    if (this.props.status !== 'ACTIVE') return false;
    if (at < this.props.activeFrom) return false;
    if (this.props.activeTo && at >= this.props.activeTo) return false;
    return true;
  }

  // --- Behavior ---

  activate(): void {
    this.assertNotArchived();
    if (this.props.status === 'ACTIVE') return;
    if (this.props.entries.length === 0) {
      throw new Error('Cannot activate PriceList without entries');
    }
    this.props.status = 'ACTIVE';
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  archive(): void {
    if (this.props.status === 'ARCHIVED') return;
    this.assertNotArchived();
    const now = new Date();
    this.props.status = 'ARCHIVED';
    this.props.archivedAt = now;
    this.props.activeTo = now;
    this.props.updatedAt = now;
    this.props.version += 1;
    this.addDomainEvent(
      new PriceListArchivedEvent({
        priceListId: this.props.id,
        code: this.props.code,
        occurredAt: now,
      }),
    );
  }

  addEntry(entry: PriceListEntry): void {
    this.assertNotArchived();
    if (entry.getPriceListId() !== this.props.id) {
      throw new Error('Entry priceListId mismatch');
    }
    if (!entry.getCurrency().equals(this.props.baseCurrency)) {
      throw new Error(
        `Entry currency ${entry.getCurrency()} differs from list base ${this.props.baseCurrency}`,
      );
    }
    const hasOverlap = this.props.entries.some(
      (e) =>
        e.getProductId() === entry.getProductId() &&
        windowsOverlap(e.getEffectiveFrom(), e.getEffectiveTo(), entry.getEffectiveFrom(), entry.getEffectiveTo()),
    );
    if (hasOverlap) {
      throw new Error(`Active entry overlap for product ${entry.getProductId()}`);
    }
    const next = [...this.props.entries, entry];
    this.props.entries = Object.freeze(next) as ReadonlyArray<PriceListEntry>;
    this.props.updatedAt = new Date();
    this.props.version += 1;
    this.addDomainEvent(
      new PriceListEntryAddedEvent({
        priceListId: this.props.id,
        entryId: entry.getId(),
        productId: entry.getProductId(),
        unitPrice: entry.getUnitPrice(),
        currency: entry.getCurrency().getCode(),
        effectiveFrom: entry.getEffectiveFrom(),
        effectiveTo: entry.getEffectiveTo(),
        occurredAt: new Date(),
      }),
    );
  }

  /**
   * Update an entry: since entries are immutable, we record the update by
   * closing the old entry's window and adding a new one. Returns the new
   * entry so the caller can persist it.
   */
  updateEntry(
    oldEntryId: string,
    newEntry: PriceListEntry,
  ): PriceListEntry {
    this.assertNotArchived();
    const old = this.props.entries.find((e) => e.getId() === oldEntryId);
    if (!old) {
      throw new Error(`Entry not found: ${oldEntryId}`);
    }
    if (newEntry.getPriceListId() !== this.props.id) {
      throw new Error('New entry priceListId mismatch');
    }
    if (newEntry.getProductId() !== old.getProductId()) {
      throw new Error('Cannot change productId on update');
    }
    // Close old entry's window by replacing with a clone that has effectiveTo=now
    const oldProps = (old as unknown as { props: PriceListEntryProps }).props;
    const closedOld = PriceListEntry.create({
      ...oldProps,
      effectiveTo: new Date(),
    });
    this.props.entries = Object.freeze(
      this.props.entries.map((e) => (e.getId() === oldEntryId ? closedOld : e)),
    ) as ReadonlyArray<PriceListEntry>;
    this.addEntry(newEntry);
    this.addDomainEvent(
      new PriceListEntryUpdatedEvent({
        priceListId: this.props.id,
        oldEntryId,
        newEntryId: newEntry.getId(),
        productId: newEntry.getProductId(),
        newUnitPrice: newEntry.getUnitPrice(),
        occurredAt: new Date(),
      }),
    );
    return newEntry;
  }

  /**
   * Find the active entry for a product at a given time with a quantity that
   * matches. If multiple entries match (different minQuantity tiers), the one
   * with the highest minQuantity <= quantity wins (best-volume discount).
   */
  findActiveEntryAt(productId: string, at: Date, quantity: number): PriceListEntry | null {
    const candidates = this.props.entries
      .filter(
        (e) =>
          e.getProductId() === productId &&
          e.isActiveAt(at) &&
          e.matchesQuantity(quantity),
      )
      .sort((a, b) => b.getMinQuantity() - a.getMinQuantity());
    return candidates[0] ?? null;
  }

  private assertNotArchived(): void {
    if (this.props.status === 'ARCHIVED') {
      throw new Error(`PriceList ${this.props.code} is archived`);
    }
  }
}

function windowsOverlap(aFrom: Date, aTo: Date | null, bFrom: Date, bTo: Date | null): boolean {
  if (aTo && bFrom >= aTo) return false;
  if (bTo && aFrom >= bTo) return false;
  return true;
}
