import { Product, type ReconstituteProductProps } from '@oserp-community/inventory/domain/entities/Product';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { Sku } from '@oserp-community/inventory/domain/value-objects/Sku';
import { ProductTypeVO } from '@oserp-community/inventory/domain/value-objects/ProductType';
import { ProcurementPolicyVO } from '@oserp-community/inventory/domain/value-objects/ProcurementPolicy';
import { TrackingTypeVO } from '@oserp-community/inventory/domain/value-objects/TrackingType';
import { Uom } from '@oserp-community/inventory/domain/value-objects/Uom';
import { Barcode } from '@oserp-community/inventory/domain/value-objects/Barcode';
import { ProductStatusVO } from '@oserp-community/inventory/domain/value-objects/ProductStatus';
import { ReorderPolicy } from '@oserp-community/inventory/domain/value-objects/ReorderPolicy';
import type {
  InvProductBarcodeRow,
  InvProductRow,
} from '../schemas';

/**
 * DB satırı + barkod satırları → Product aggregate.
 */
export function productRowToDomain(
  row: InvProductRow,
  barcodeRows: ReadonlyArray<InvProductBarcodeRow>,
): Product {
  const barcodes: Barcode[] = barcodeRows.map((b) =>
    Barcode.create(b.code, b.symbology, b.isPrimary),
  );

  const props: ReconstituteProductProps = {
    id: ProductId.create(row.id),
    sku: Sku.create(row.sku),
    name: row.name,
    description: row.description,
    type: ProductTypeVO.create(row.type),
    procurementPolicy: ProcurementPolicyVO.create(row.procurementPolicy),
    trackingType: TrackingTypeVO.create(row.trackingType),
    baseUom: Uom.create(row.baseUom),
    categoryId: row.categoryId,
    status: ProductStatusVO.create(row.status),
    reorderPolicy: ReorderPolicy.create({
      minQty: row.minQty,
      maxQty: row.maxQty,
      reorderQty: row.reorderQty,
      safetyStock: row.safetyStock,
    }),
    barcodes,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return Product.reconstitute(props);
}

/**
 * Product aggregate → DB satırı (insert/update için).
 */
export function productToPersistence(product: Product): InvProductRow {
  return {
    id: product.getId().toString(),
    sku: product.getSku().getValue(),
    name: product.getName(),
    description: product.getDescription(),
    type: product.getType().getValue(),
    procurementPolicy: product.getProcurementPolicy().getValue(),
    trackingType: product.getTrackingType().getValue(),
    baseUom: product.getBaseUom().toString(),
    categoryId: product.getCategoryId(),
    status: product.getStatus().getValue(),
    minQty: product.getReorderPolicy().getMinQty(),
    maxQty: product.getReorderPolicy().getMaxQty(),
    reorderQty: product.getReorderPolicy().getReorderQty(),
    safetyStock: product.getReorderPolicy().getSafetyStock(),
    createdAt: product.getCreatedAt(),
    updatedAt: product.getUpdatedAt(),
    version: product.getVersion(),
  };
}

/**
 * Barcode (aggregate'in parçası) → DB satırı.
 */
export function barcodeToPersistence(
  productId: string,
  barcode: Barcode,
): InvProductBarcodeRow {
  return {
    id: '', // DB tarafından üretilecek
    productId,
    code: barcode.getCode(),
    symbology: barcode.getSymbology(),
    isPrimary: barcode.isPrimaryBarcode(),
  };
}
