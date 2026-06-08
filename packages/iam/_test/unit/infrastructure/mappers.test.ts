import { UserCreatedEvent } from '@oserp-community/iam/domain/events/UserCreatedEvent';
import {
  type ApiCredentialPersistenceModel,
  apiCredentialToDomain,
  apiCredentialToPersistence,
} from '@oserp-community/iam/infrastructure/persistance/mappers/ApiCredentialMapper';
import {
  type MembershipPersistenceModel,
  membershipToDomain,
  membershipToPersistence,
} from '@oserp-community/iam/infrastructure/persistance/mappers/MembershipMapper';
import { domainEventToOutbox } from '@oserp-community/iam/infrastructure/persistance/mappers/OutboxMapper';
import {
  type PermissionPersistenceModel,
  permissionToDomain,
  permissionToPersistence,
} from '@oserp-community/iam/infrastructure/persistance/mappers/PermissionMapper';
import {
  type RolePersistenceModel,
  roleToDomain,
  roleToPersistence,
} from '@oserp-community/iam/infrastructure/persistance/mappers/RoleMapper';
import {
  type SessionPersistenceModel,
  sessionToDomain,
  sessionToPersistence,
} from '@oserp-community/iam/infrastructure/persistance/mappers/SessionMapper';
import {
  type UserCredentialPersistenceModel,
  userCredentialToDomain,
  userCredentialToPersistence,
} from '@oserp-community/iam/infrastructure/persistance/mappers/UserCredentialMapper';
import {
  type UserPersistenceModel,
  userToDomain,
  userToPersistence,
} from '@oserp-community/iam/infrastructure/persistance/mappers/UserMapper';
import { describe, expect, it } from 'vitest';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const ROLE_ID = '33333333-3333-4333-8333-333333333333';
const MEMBERSHIP_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';
const API_KEY_ID = '66666666-6666-4666-8666-666666666666';
const PERMISSION_ID = '77777777-7777-4777-8777-777777777777';

describe('UserMapper', () => {
  it('persistence -> domain -> persistence ayni modeli korur', () => {
    const row: UserPersistenceModel = {
      id: USER_ID,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      username: 'adalovelace',
      status: 'active',
      isEmailVerified: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    expect(userToPersistence(userToDomain(row))).toEqual(row);
  });
});

describe('UserCredentialMapper', () => {
  it('persistence -> domain -> persistence ayni modeli korur', () => {
    const row: UserCredentialPersistenceModel = {
      userId: USER_ID,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA',
      passwordUpdatedAt: new Date('2026-01-03T00:00:00.000Z'),
      mustChangePassword: false,
    };

    expect(userCredentialToPersistence(userCredentialToDomain(row))).toEqual(row);
  });
});

describe('RoleMapper', () => {
  it('persistence -> domain -> persistence ayni modeli korur', () => {
    const row: RolePersistenceModel = {
      id: ROLE_ID,
      companyId: COMPANY_ID,
      name: 'admin',
      displayName: 'Yonetici',
      description: 'Tam yetkili rol',
      isSystemRole: false,
      status: 'active',
    };

    expect(roleToPersistence(roleToDomain(row, []))).toEqual(row);
  });

  it('izin kodlarini round-trip boyunca korur', () => {
    const row: RolePersistenceModel = {
      id: ROLE_ID,
      companyId: null,
      name: 'system-role',
      displayName: 'Sistem Rolu',
      description: null,
      isSystemRole: true,
      status: 'active',
    };
    const codes = ['iam.user.read', 'iam.user.create'];

    const role = roleToDomain(row, codes);

    expect([...role.getPermissionCodes()].sort()).toEqual([...codes].sort());
  });
});

describe('PermissionMapper', () => {
  it('persistence -> domain -> persistence ayni modeli korur', () => {
    const row: PermissionPersistenceModel = {
      id: PERMISSION_ID,
      module: 'iam',
      resource: 'user',
      action: 'read',
      code: 'iam.user.read',
      description: 'Kullanici okuma izni',
      createdAt: new Date('2026-01-04T00:00:00.000Z'),
    };

    expect(permissionToPersistence(permissionToDomain(row))).toEqual(row);
  });

  it('null description ile round-trip yapar', () => {
    const row: PermissionPersistenceModel = {
      id: PERMISSION_ID,
      module: 'iam',
      resource: 'role',
      action: 'list',
      code: 'iam.role.list',
      description: null,
      createdAt: new Date('2026-01-05T00:00:00.000Z'),
    };

    expect(permissionToPersistence(permissionToDomain(row))).toEqual(row);
  });
});

describe('MembershipMapper', () => {
  it('persistence -> domain -> persistence ayni modeli korur', () => {
    const row: MembershipPersistenceModel = {
      id: MEMBERSHIP_ID,
      userId: USER_ID,
      companyId: COMPANY_ID,
      status: 'active',
    };

    expect(membershipToPersistence(membershipToDomain(row, []))).toEqual(row);
  });

  it('rol kimliklerini round-trip boyunca korur', () => {
    const row: MembershipPersistenceModel = {
      id: MEMBERSHIP_ID,
      userId: USER_ID,
      companyId: COMPANY_ID,
      status: 'suspended',
    };
    const roleIds = [ROLE_ID];

    const membership = membershipToDomain(row, roleIds);

    expect(membership.getRoleIds()).toEqual(roleIds);
  });
});

describe('SessionMapper', () => {
  it('persistence -> domain -> persistence ayni modeli korur', () => {
    const row: SessionPersistenceModel = {
      id: SESSION_ID,
      userId: USER_ID,
      refreshTokenHash: 'a'.repeat(64),
      status: 'active',
      createdAt: new Date('2026-01-06T00:00:00.000Z'),
      expiresAt: new Date('2026-02-06T00:00:00.000Z'),
      lastRefreshedAt: new Date('2026-01-06T00:00:00.000Z'),
    };

    expect(sessionToPersistence(sessionToDomain(row))).toEqual(row);
  });
});

describe('ApiCredentialMapper', () => {
  it('persistence -> domain -> persistence ayni modeli korur', () => {
    const row: ApiCredentialPersistenceModel = {
      id: API_KEY_ID,
      companyId: COMPANY_ID,
      name: 'CI anahtari',
      prefix: 'abcd1234',
      secretHash: 'b'.repeat(64),
      status: 'active',
      createdAt: new Date('2026-01-07T00:00:00.000Z'),
      lastRotatedAt: null,
    };

    expect(apiCredentialToPersistence(apiCredentialToDomain(row))).toEqual(row);
  });

  it('rotasyon tarihi ile round-trip yapar', () => {
    const row: ApiCredentialPersistenceModel = {
      id: API_KEY_ID,
      companyId: COMPANY_ID,
      name: 'Rotasyonlu anahtar',
      prefix: 'wxyz7890',
      secretHash: 'c'.repeat(64),
      status: 'revoked',
      createdAt: new Date('2026-01-07T00:00:00.000Z'),
      lastRotatedAt: new Date('2026-01-08T00:00:00.000Z'),
    };

    expect(apiCredentialToPersistence(apiCredentialToDomain(row))).toEqual(row);
  });
});

describe('OutboxMapper', () => {
  it('domain event alanlarini outbox satirina serilestirir', () => {
    const event = new UserCreatedEvent(USER_ID, 'ada@example.com', 'Ada Lovelace');

    const row = domainEventToOutbox(event);

    expect(row.eventName).toBe(event.eventName);
    expect(row.aggregateId).toBe(event.aggregateId);
    expect(row.occurredOn).toBe(event.occurredOn);
    expect(JSON.parse(row.payload)).toMatchObject({
      eventName: event.eventName,
      aggregateId: event.aggregateId,
    });
  });
});
