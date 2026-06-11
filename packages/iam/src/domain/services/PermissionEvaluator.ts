import type { PermissionCode } from '../value-objects/PermissionCode';

/**
 * Bir kullanıcının/rolün efektif izinleri üzerinde yetki değerlendirmesi yapar.
 * `module.resource.action` formatında eşleşme yapar; `*` joker karakterini destekler
 * (ör. `catalog.product.*` veya `*.*.*`).
 */
export class PermissionEvaluator {
  private readonly granted: Set<string>;

  constructor(grantedCodes: string[]) {
    this.granted = new Set(grantedCodes);
  }

  has(required: PermissionCode): boolean {
    return this.hasCode(required.getValue());
  }

  hasCode(required: string): boolean {
    if (this.granted.has(required)) {
      return true;
    }

    // Wildcard: kullanıcının herhangi bir granted kodu "*" içeriyorsa
    // tüm permission'lara otomatik sahiptir. "Sales/Catalog ileride eklendi"
    // senaryosunda sistem kullanıcısı yeni permission'ları da miras alır.
    if (this.granted.has('*')) {
      return true;
    }

    const [module, resource, action] = required.split('.');
    if (!module || !resource || !action) {
      return false;
    }

    const candidates = [
      `${module}.${resource}.*`,
      `${module}.*.*`,
      `${module}.*.${action}`,
      `*.*.*`,
    ];

    return candidates.some((candidate) => this.granted.has(candidate));
  }
}
