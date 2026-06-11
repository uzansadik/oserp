import { ReorderStatusVO } from '../../domain/value-objects/ReorderStatus';
import type { ReorderPolicy } from '../../domain/value-objects/ReorderPolicy';
import type { InventoryLevel } from '../../domain/entities/InventoryLevel';
import type { ReorderEvaluator } from '../ports/ReorderEvaluatorPort';

/**
 * Stock seviyesini reorder policy ile kıyaslayıp LOW / OUT / OVERSTOCK / HEALTHY
 * durumunu hesaplar. BigInt tabanlı karşılaştırma (Number hassasiyet sorunlarını önler).
 */
export class DefaultReorderEvaluator implements ReorderEvaluator {
  evaluate(
    level: Pick<InventoryLevel, 'getQuantity'>,
    policy: ReorderPolicy | null,
  ): ReorderStatusVO {
    const onHand = toBigInt(level.getQuantity().getOnHand());
    if (onHand === 0n) return ReorderStatusVO.out();
    if (!policy) return ReorderStatusVO.healthy();

    const minStr = policy.getMinQty();
    const maxStr = policy.getMaxQty();

    if (maxStr !== null && onHand > toBigInt(maxStr)) {
      return ReorderStatusVO.overstock();
    }
    if (minStr !== null && onHand < toBigInt(minStr)) {
      return ReorderStatusVO.low();
    }
    return ReorderStatusVO.healthy();
  }
}

function toBigInt(value: string | null): bigint {
  if (value === null) return 0n;
  if (!value.includes('.')) return BigInt(value);
  const [intPart, decPart = ''] = value.split('.');
  const padded = (decPart ?? '').padEnd(6, '0').slice(0, 6);
  return BigInt(`${intPart}${padded}`);
}
