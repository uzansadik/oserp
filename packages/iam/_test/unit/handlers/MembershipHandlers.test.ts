import {
  AssignRoleToMemberHandler,
  GrantMembershipHandler,
  RevokeRoleFromMemberHandler,
  SuspendMembershipHandler,
} from '@oserp-community/iam/application/handlers/MembershipHandlers';
import { CreateRoleHandler } from '@oserp-community/iam/application/handlers/RoleHandlers';
import { RegisterUserHandler } from '@oserp-community/iam/application/handlers/UserHandlers';
import { MembershipGrantedEvent } from '@oserp-community/iam/domain/events/MembershipGrantedEvent';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakePasswordHasher, InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

async function registerUser(uow: InMemoryUnitOfWork, suffix = ''): Promise<string> {
  const { userId } = await new RegisterUserHandler(uow, new FakePasswordHasher()).execute({
    name: 'Ahmet',
    surname: 'Yilmaz',
    email: `ahmet${suffix}@example.com`,
    username: `ahmety${suffix}`,
    password: 'Abcdef12',
  });
  return userId;
}

async function createSystemRole(uow: InMemoryUnitOfWork, name = 'manager'): Promise<string> {
  const { roleId } = await new CreateRoleHandler(uow).execute({
    name,
    displayName: name,
    companyId: null,
    description: null,
  });
  return roleId;
}

describe('GrantMembershipHandler', () => {
  let uow: InMemoryUnitOfWork;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
  });

  it('kullaniciya uyelik verir ve event uretir', async () => {
    const userId = await registerUser(uow);
    uow.outbox.events.length = 0;

    const { membershipId } = await new GrantMembershipHandler(uow).execute({
      userId,
      companyId: COMPANY_ID,
    });

    expect(uow.memberships.store.has(membershipId)).toBe(true);
    expect(uow.outbox.events[0]).toBeInstanceOf(MembershipGrantedEvent);
  });

  it('rollerle birlikte uyelik verir', async () => {
    const userId = await registerUser(uow);
    const roleId = await createSystemRole(uow);

    const { membershipId } = await new GrantMembershipHandler(uow).execute({
      userId,
      companyId: COMPANY_ID,
      roleIds: [roleId],
    });

    expect(uow.memberships.store.get(membershipId)!.getRoleIds()).toContain(roleId);
  });

  it('var olmayan kullanici icin hata firlatir', async () => {
    await expect(
      new GrantMembershipHandler(uow).execute({
        userId: '22222222-2222-4222-8222-222222222222',
        companyId: COMPANY_ID,
      }),
    ).rejects.toThrow('User not found');
  });

  it('ayni sirkette ikinci uyelik verilemez', async () => {
    const userId = await registerUser(uow);
    await new GrantMembershipHandler(uow).execute({ userId, companyId: COMPANY_ID });

    await expect(
      new GrantMembershipHandler(uow).execute({ userId, companyId: COMPANY_ID }),
    ).rejects.toThrow('already has a membership');
  });
});

describe('AssignRoleToMemberHandler & RevokeRoleFromMemberHandler', () => {
  it('uyelige rol atar ve geri alir', async () => {
    const uow = new InMemoryUnitOfWork();
    const userId = await registerUser(uow);
    const roleId = await createSystemRole(uow);
    const { membershipId } = await new GrantMembershipHandler(uow).execute({
      userId,
      companyId: COMPANY_ID,
    });

    await new AssignRoleToMemberHandler(uow).execute({ membershipId, roleId });
    expect(uow.memberships.store.get(membershipId)!.getRoleIds()).toContain(roleId);

    await new RevokeRoleFromMemberHandler(uow).execute({ membershipId, roleId });
    expect(uow.memberships.store.get(membershipId)!.getRoleIds()).not.toContain(roleId);
  });
});

describe('SuspendMembershipHandler', () => {
  it('uyeligi askiya alir', async () => {
    const uow = new InMemoryUnitOfWork();
    const userId = await registerUser(uow);
    const { membershipId } = await new GrantMembershipHandler(uow).execute({
      userId,
      companyId: COMPANY_ID,
    });

    await new SuspendMembershipHandler(uow).execute({ membershipId });
    expect(uow.memberships.store.get(membershipId)!.getStatus()).toBe('suspended');
  });
});
