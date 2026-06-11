import { ValidationError } from '../errors/ValidationError';

/**
 * DocumentRef — Hareketi doğuran dış kaynak doküman.
 * Örn: bir PurchaseOrder'dan gelen RECEIPT, bir SalesOrder'dan gelen ISSUE.
 *
 * MVP'de serbest `string` ID + type; ileride cross-context ref'lerle zenginleşir.
 */
export enum DocumentType {
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  SALES_ORDER = 'SALES_ORDER',
  PRODUCTION_ORDER = 'PRODUCTION_ORDER',
  TRANSFER_ORDER = 'TRANSFER_ORDER',
  ADJUSTMENT = 'ADJUSTMENT',
  MANUAL = 'MANUAL',
}

const ALLOWED: ReadonlyArray<DocumentType> = [
  DocumentType.PURCHASE_ORDER,
  DocumentType.SALES_ORDER,
  DocumentType.PRODUCTION_ORDER,
  DocumentType.TRANSFER_ORDER,
  DocumentType.ADJUSTMENT,
  DocumentType.MANUAL,
];

export class DocumentRef {
  private constructor(
    private readonly type: DocumentType,
    private readonly documentId: string | null,
  ) {}

  static create(type: DocumentType | string, documentId?: string | null): DocumentRef {
    const upper = String(type).toUpperCase() as DocumentType;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid document type: ${type} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    const id = documentId ?? null;
    if (id !== null && id.length > 64) {
      throw new ValidationError(`Document ID too long (max 64): ${id}`);
    }
    return new DocumentRef(upper, id);
  }

  static none(): DocumentRef {
    return new DocumentRef(DocumentType.MANUAL, null);
  }

  getType(): DocumentType { return this.type; }
  getDocumentId(): string | null { return this.documentId; }

  equals(other: DocumentRef): boolean {
    return this.type === other.type && this.documentId === other.documentId;
  }

  static equals(a: DocumentRef, b: DocumentRef): boolean {
    return a.type === b.type && a.documentId === b.documentId;
  }
}
