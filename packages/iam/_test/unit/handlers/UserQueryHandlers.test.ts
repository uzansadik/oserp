import { RegisterUserHandler } from '@oserp-community/iam/application/handlers/UserHandlers';
import {
  GetUserByEmailHandler,
  GetUserByIdHandler,
  ListUsersHandler,
} from '@oserp-community/iam/application/handlers/UserQueryHandlers';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakePasswordHasher, InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

async function register(uow: InMemoryUnitOfWork, suffix: string): Promise<string> {
  const { userId } = await new RegisterUserHandler(uow, new FakePasswordHasher()).execute({
    name: 'Ahmet',
    surname: 'Yilmaz',
    email: `ahmet${suffix}@example.com`,
    username: `ahmety${suffix}`,
    password: 'Abcdef12',
  });
  return userId;
}

describe('User query handlers', () => {
  let uow: InMemoryUnitOfWork;
  let userId: string;

  beforeEach(async () => {
    uow = new InMemoryUnitOfWork();
    userId = await register(uow, '1');
    await register(uow, '2');
  });

  it('GetUserById kullaniciyi doner', async () => {
    const view = await new GetUserByIdHandler(uow.users).execute({ userId });
    expect(view).not.toBeNull();
    expect(view!.email).toBe('ahmet1@example.com');
    expect(view!.fullName).toBe('Ahmet Yilmaz');
  });

  it('GetUserById var olmayan id icin null doner', async () => {
    const view = await new GetUserByIdHandler(uow.users).execute({
      userId: '22222222-2222-4222-8222-222222222222',
    });
    expect(view).toBeNull();
  });

  it('GetUserByEmail kullaniciyi doner', async () => {
    const view = await new GetUserByEmailHandler(uow.users).execute({
      email: 'ahmet2@example.com',
    });
    expect(view).not.toBeNull();
    expect(view!.username).toBe('ahmety2');
  });

  it('ListUsers tum kullanicilari doner', async () => {
    const views = await new ListUsersHandler(uow.users).execute({});
    expect(views).toHaveLength(2);
  });
});
