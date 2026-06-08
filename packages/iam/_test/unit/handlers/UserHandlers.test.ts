import {
  ChangePasswordHandler,
  ChangeUserStatusHandler,
  RegisterUserHandler,
  VerifyEmailHandler,
} from '@oserp-community/iam/application/handlers/UserHandlers';
import { UserCreatedEvent } from '@oserp-community/iam/domain/events/UserCreatedEvent';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakePasswordHasher, InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

describe('RegisterUserHandler', () => {
  let uow: InMemoryUnitOfWork;
  let handler: RegisterUserHandler;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    handler = new RegisterUserHandler(uow, new FakePasswordHasher());
  });

  const validCommand = {
    name: 'Ahmet',
    surname: 'Yilmaz',
    email: 'ahmet@example.com',
    username: 'ahmety',
    password: 'Abcdef12',
  };

  it('yeni kullanici kaydeder, credential olusturur ve event uretir', async () => {
    const { userId } = await handler.execute(validCommand);

    expect(uow.users.store.size).toBe(1);
    expect(uow.userCredentials.store.has(userId)).toBe(true);
    expect(uow.outbox.events[0]).toBeInstanceOf(UserCreatedEvent);
  });

  it('ayni email ile ikinci kayit hata firlatir', async () => {
    await handler.execute(validCommand);
    await expect(handler.execute({ ...validCommand, username: 'other' })).rejects.toThrow(
      'Email already in use',
    );
  });

  it('zayif parola validasyon hatasi firlatir', async () => {
    await expect(handler.execute({ ...validCommand, password: 'weak' })).rejects.toThrow();
  });
});

describe('ChangePasswordHandler', () => {
  it('dogru mevcut parola ile parolayi degistirir', async () => {
    const uow = new InMemoryUnitOfWork();
    const hasher = new FakePasswordHasher();
    const register = new RegisterUserHandler(uow, hasher);
    const { userId } = await register.execute({
      name: 'Ahmet',
      surname: 'Yilmaz',
      email: 'ahmet@example.com',
      username: 'ahmety',
      password: 'Abcdef12',
    });

    const handler = new ChangePasswordHandler(uow, hasher);
    await handler.execute({
      userId,
      currentPassword: 'Abcdef12',
      newPassword: 'Zxcvbn99',
    });

    const credential = await uow.userCredentials.findByUserId({ toString: () => userId });
    expect(await hasher.verify('Zxcvbn99', credential!.getHash())).toBe(true);
  });

  it('yanlis mevcut parola hata firlatir', async () => {
    const uow = new InMemoryUnitOfWork();
    const hasher = new FakePasswordHasher();
    const register = new RegisterUserHandler(uow, hasher);
    const { userId } = await register.execute({
      name: 'Ahmet',
      surname: 'Yilmaz',
      email: 'ahmet@example.com',
      username: 'ahmety',
      password: 'Abcdef12',
    });

    const handler = new ChangePasswordHandler(uow, hasher);
    await expect(
      handler.execute({ userId, currentPassword: 'Wrong123', newPassword: 'Zxcvbn99' }),
    ).rejects.toThrow('Current password is incorrect');
  });
});

describe('VerifyEmailHandler & ChangeUserStatusHandler', () => {
  const setup = async () => {
    const uow = new InMemoryUnitOfWork();
    const hasher = new FakePasswordHasher();
    const { userId } = await new RegisterUserHandler(uow, hasher).execute({
      name: 'Ahmet',
      surname: 'Yilmaz',
      email: 'ahmet@example.com',
      username: 'ahmety',
      password: 'Abcdef12',
    });
    uow.outbox.events.length = 0;
    return { uow, userId };
  };

  it('email dogrular', async () => {
    const { uow, userId } = await setup();
    await new VerifyEmailHandler(uow).execute({ userId });
    expect(uow.users.store.get(userId)!.isEmailVerified).toBe(true);
  });

  it('status degistirir', async () => {
    const { uow, userId } = await setup();
    await new ChangeUserStatusHandler(uow).execute({ userId, status: 'suspended' });
    expect(uow.users.store.get(userId)!.status.value).toBe('suspended');
  });
});
