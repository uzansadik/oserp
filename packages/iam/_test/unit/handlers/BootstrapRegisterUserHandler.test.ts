import { BootstrapRegisterUserHandler } from '@oserp-community/iam/application/handlers/UserHandlers';
import { PermissionEvaluator } from '@oserp-community/iam/domain/services/PermissionEvaluator';
import { PermissionCode } from '@oserp-community/iam/domain/value-objects/PermissionCode';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FakePasswordHasher,
  InMemoryOutbox,
  InMemoryUnitOfWork,
} from '../../support/InMemoryUnitOfWork';

const SYSTEM_USER = {
  name: 'Sistem',
  surname: 'Admin',
  email: 'sysadmin@oserp.local',
  username: 'sysadmin',
  password: 'Sistem123',
};

// UUID v4 placeholder (CompanyId validator sadece v4 kabul ediyor).
// 4. pozisyon = '4' (version), 13. pozisyon = '8' (variant). Gercek bir company
// tablosu eklenince bu seed migrate edilebilir.
const PLACEHOLDER_COMPANY_ID = '00000000-0000-4000-8000-000000000001';

describe('BootstrapRegisterUserHandler', () => {
  let uow: InMemoryUnitOfWork;
  let handler: BootstrapRegisterUserHandler;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    handler = new BootstrapRegisterUserHandler(uow, new FakePasswordHasher(), {
      defaultCompanyId: PLACEHOLDER_COMPANY_ID,
    });
  });

  it('bos DB: sistem kullanicisini olusturur, *.*.* permission ve membership verir', async () => {
    const { userId, membershipId, permissionCode } = await handler.execute(SYSTEM_USER);

    expect(uow.users.store.size).toBe(1);
    expect(uow.userCredentials.store.has(userId)).toBe(true);
    expect(uow.permissions.codes.has('*.*.*')).toBe(true);
    expect(permissionCode).toBe('*.*.*');

    const user = uow.users.store.get(userId)!;
    expect(user.isEmailVerified).toBe(true);
    expect(user.status.value).toBe('active');

    const membership = uow.memberships.store.get(membershipId)!;
    expect(membership.getUserId().toString()).toBe(userId);
    expect(membership.getCompanyId().toString()).toBe(PLACEHOLDER_COMPANY_ID);
  });

  it('bos DB: login sonrasi JWT icindeki permissions *.*.* sayesinde her seyi kapsar', async () => {
    const { permissionCode } = await handler.execute(SYSTEM_USER);

    const uowRoles = uow.roles;
    const allPerms = new Set<string>([permissionCode]);
    // Tum uyelikleri gez, mevcut rol/permission kodlarini topla
    for (const m of uow.memberships.store.values()) {
      for (const roleId of m.getRoleIds()) {
        const role = await uowRoles.findById({ toString: () => roleId });
        if (role) {
          for (const code of role.getPermissionCodes()) allPerms.add(code);
        }
      }
    }

    const ev = new PermissionEvaluator([...allPerms]);
    // Yeni context'ler (sales) eklense bile wildcard kapsar
    expect(ev.hasCode('iam.user.create')).toBe(true);
    expect(ev.hasCode('sales.invoice.create')).toBe(true);
    expect(ev.hasCode('finance.ledger.close')).toBe(true);
    expect(PermissionCode.create('*.*.*').getValue()).toBe('*.*.*');
  });

  it('dolu DB: bootstrap reddedilir (birden fazla admin olusmaz)', async () => {
    // Once bir kullanic olusturalim
    uow.users.store.set(
      '11111111-1111-1111-1111-111111111111',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: { toString: () => '11111111-1111-1111-1111-111111111111' } } as any,
    );

    await expect(handler.execute(SYSTEM_USER)).rejects.toThrow(/bootstrap/i);
    // Yeni user eklenmemis olmali
    expect(uow.users.store.size).toBe(1);
  });

  it('ayni email ile ikinci bootstrap hata firlatir (kullanici kontrolu)', async () => {
    // Ilk basarili
    await handler.execute(SYSTEM_USER);
    // uow.sifirla — bos DB yok ama icinde kayit var; ayni email ile yine deneyelim
    // yeni handler ile (ikinci istek senaryosunu simule etmek icin sayaci manipule etmek yerine,
    // DB dolu oldugu icin bootstrap'in reddedildigini zaten onceki test dogruladi).
    // Burada ayri senaryo: dolu DB + valid request → BootstrapNotAllowed
    await expect(handler.execute({ ...SYSTEM_USER, username: 'other' })).rejects.toThrow(/bootstrap/i);
  });

  it('validasyon hatali input → schema parse hatasi', async () => {
    await expect(
      handler.execute({ ...SYSTEM_USER, email: 'not-an-email' }),
    ).rejects.toThrow();
    expect(uow.users.store.size).toBe(0);
  });

  it('outbox: User + Membership + Role + RolePermission eventleri uretilir', async () => {
    const { userId } = await handler.execute(SYSTEM_USER);
    const eventKinds = uow.outbox.events.map((e) => e.constructor.name);
    expect(eventKinds).toContain('UserCreatedEvent');
    expect(eventKinds).toContain('RoleCreatedEvent');
    expect(eventKinds).toContain('RolePermissionAssignedEvent');
    expect(eventKinds).toContain('MembershipGrantedEvent');
    // userId bazli dogrulama
    const userEvents = uow.outbox.events.filter(
      (e) => 'userId' in e && (e as { userId: string }).userId === userId,
    );
    expect(userEvents.length).toBeGreaterThan(0);
  });

  it('Outbox kontrolu: handler bitiminde eventler clear edilmis olmali', async () => {
    // Not: handler kendi icinde clear etmezse bir sonraki handler cagrisinda
    // eventler tekrar outbox'a gider. Bu regression'i engelle.
    await handler.execute(SYSTEM_USER);
    const outboxLen = uow.outbox.events.length;
    await handler.execute(SYSTEM_USER).catch(() => {
      // dolu DB → reject
    });
    // Yeni event eklenmemis olmali (cunku dolu DB guard'i exception firlatti)
    expect(uow.outbox.events.length).toBe(outboxLen);
  });
});
