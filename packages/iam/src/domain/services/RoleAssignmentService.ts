import type { MembershipAggregate } from '../aggregates/MembershipAggregate';
import type { Role } from '../entities/Role';

/**
 * Bir rolün bir üyeliğe (membership) atanabilirliğini denetleyen domain servisi.
 * Kurallar:
 *  - Rol aktif olmalı.
 *  - Sistem rolü (companyId = null) her şirkete atanabilir.
 *  - Şirkete özel rol, yalnızca aynı şirketin üyeliğine atanabilir.
 */
export class RoleAssignmentService {
  ensureAssignable(role: Role, membership: MembershipAggregate): void {
    if (role.getStatus().isInactive()) {
      throw new Error('Cannot assign an inactive role');
    }

    const roleCompanyId = role.getCompanyId();
    if (roleCompanyId === null) {
      return;
    }

    if (!roleCompanyId.equals(membership.getCompanyId())) {
      throw new Error('Role belongs to a different company than the membership');
    }
  }

  canAssign(role: Role, membership: MembershipAggregate): boolean {
    try {
      this.ensureAssignable(role, membership);
      return true;
    } catch {
      return false;
    }
  }
}
