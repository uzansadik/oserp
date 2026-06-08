import {
  LoginHandler,
  LogoutHandler,
  RefreshSessionHandler,
} from '@oserp-community/iam/application/handlers/AuthHandlers';
import { RegisterUserHandler } from '@oserp-community/iam/application/handlers/UserHandlers';
import { SessionStartedEvent } from '@oserp-community/iam/domain/events/SessionStartedEvent';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FakePasswordHasher,
  FakeRefreshTokenHasher,
  FakeTokenService,
  FixedClock,
  InMemoryUnitOfWork,
} from '../../support/InMemoryUnitOfWork';

const CREDENTIALS = {
  name: 'Ahmet',
  surname: 'Yilmaz',
  email: 'ahmet@example.com',
  username: 'ahmety',
  password: 'Abcdef12',
};

async function setup() {
  const uow = new InMemoryUnitOfWork();
  const passwordHasher = new FakePasswordHasher();
  const refreshHasher = new FakeRefreshTokenHasher();
  const tokenService = new FakeTokenService();
  const clock = new FixedClock(new Date());

  const { userId } = await new RegisterUserHandler(uow, passwordHasher).execute(CREDENTIALS);
  uow.outbox.events.length = 0;

  const login = new LoginHandler(uow, passwordHasher, refreshHasher, tokenService, clock);
  const refresh = new RefreshSessionHandler(uow, refreshHasher, tokenService, clock);
  const logout = new LogoutHandler(uow, refreshHasher);

  return { uow, userId, clock, login, refresh, logout };
}

describe('LoginHandler', () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  beforeEach(async () => {
    ctx = await setup();
  });

  it('gecerli kimlikle oturum acar ve token doner', async () => {
    const result = await ctx.login.execute({
      email: CREDENTIALS.email,
      password: CREDENTIALS.password,
    });

    expect(result.accessToken).toBe(`access:${ctx.userId}`);
    expect(result.refreshToken).toBeTruthy();
    expect(ctx.uow.sessions.store.has(result.sessionId)).toBe(true);
    expect(ctx.uow.outbox.events[0]).toBeInstanceOf(SessionStartedEvent);
  });

  it('yanlis parola hata firlatir', async () => {
    await expect(
      ctx.login.execute({ email: CREDENTIALS.email, password: 'WrongPass1' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('var olmayan email hata firlatir', async () => {
    await expect(
      ctx.login.execute({ email: 'nobody@example.com', password: CREDENTIALS.password }),
    ).rejects.toThrow('Invalid credentials');
  });
});

describe('RefreshSessionHandler', () => {
  it('refresh token ile yeni token uretir ve eskisini gecersiz kilar', async () => {
    const ctx = await setup();
    const first = await ctx.login.execute({
      email: CREDENTIALS.email,
      password: CREDENTIALS.password,
    });

    ctx.clock.advance(60_000);
    const second = await ctx.refresh.execute({ refreshToken: first.refreshToken });

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.sessionId).toBe(first.sessionId);

    await expect(ctx.refresh.execute({ refreshToken: first.refreshToken })).rejects.toThrow(
      'Invalid refresh token',
    );
  });

  it('gecersiz refresh token hata firlatir', async () => {
    const ctx = await setup();
    await expect(ctx.refresh.execute({ refreshToken: 'bogus' })).rejects.toThrow(
      'Invalid refresh token',
    );
  });
});

describe('LogoutHandler', () => {
  it('oturumu gecersiz kilar', async () => {
    const ctx = await setup();
    const result = await ctx.login.execute({
      email: CREDENTIALS.email,
      password: CREDENTIALS.password,
    });

    await ctx.logout.execute({ refreshToken: result.refreshToken });

    expect(ctx.uow.sessions.store.get(result.sessionId)!.getStatus()).toBe('revoked');
    await expect(ctx.refresh.execute({ refreshToken: result.refreshToken })).rejects.toThrow(
      'Session is not active',
    );
  });
});
