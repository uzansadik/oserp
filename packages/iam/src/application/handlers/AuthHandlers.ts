import { SessionAggregate } from '../../domain/aggregates/SessionAggregate';
import { Email } from '../../domain/value-objects/Email';
import { RefreshToken } from '../../domain/value-objects/RefreshToken';
import {
  type AuthTokens,
  type LoginCommand,
  type LogoutCommand,
  loginSchema,
  logoutSchema,
  type RefreshSessionCommand,
  refreshSessionSchema,
} from '../commands/AuthCommands';
import type { CommandHandler } from '../Handler';
import type { ClockPort } from '../ports/ClockPort';
import type { PasswordHasherPort } from '../ports/PasswordHasherPort';
import type { RefreshTokenHasherPort } from '../ports/RefreshTokenHasherPort';
import type { TokenServicePort } from '../ports/TokenServicePort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';

export type AuthHandlerConfig = {
  /** Refresh token geçerlilik süresi (ms). Varsayılan 30 gün. */
  refreshTokenTtlMs?: number;
};

const DEFAULT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class LoginHandler implements CommandHandler<LoginCommand, AuthTokens> {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly refreshTokenHasher: RefreshTokenHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly clock: ClockPort,
    config: AuthHandlerConfig = {},
  ) {
    this.refreshTtlMs = config.refreshTokenTtlMs ?? DEFAULT_REFRESH_TTL_MS;
  }

  async execute(input: LoginCommand): Promise<AuthTokens> {
    const command = loginSchema.parse(input);
    const email = Email.create(command.email);

    return this.uow.execute(async (ctx) => {
      const user = await ctx.users.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }
      if (!user.status.canLogin()) {
        throw new Error('User cannot login in the current status');
      }

      const credential = await ctx.userCredentials.findByUserId(user.id);
      if (!credential) {
        throw new Error('Invalid credentials');
      }

      const passwordValid = await this.passwordHasher.verify(
        command.password,
        credential.getHash(),
      );
      if (!passwordValid) {
        throw new Error('Invalid credentials');
      }

      const now = this.clock.now();
      const rawRefreshToken = RefreshToken.generate();
      const refreshTokenHash = await this.refreshTokenHasher.hash(rawRefreshToken.getValue());
      const expiresAt = new Date(now.getTime() + this.refreshTtlMs);

      const session = SessionAggregate.start({
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      });

      const accessToken = await this.tokenService.signAccessToken({ sub: user.id.toString() });

      await ctx.sessions.save(session);
      await ctx.outbox.enqueue(session.getDomainEvents());
      session.clearDomainEvents();

      return {
        accessToken,
        refreshToken: rawRefreshToken.getValue(),
        sessionId: session.getId().toString(),
        expiresAt,
      };
    });
  }
}

export class RefreshSessionHandler implements CommandHandler<RefreshSessionCommand, AuthTokens> {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly refreshTokenHasher: RefreshTokenHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly clock: ClockPort,
    config: AuthHandlerConfig = {},
  ) {
    this.refreshTtlMs = config.refreshTokenTtlMs ?? DEFAULT_REFRESH_TTL_MS;
  }

  async execute(input: RefreshSessionCommand): Promise<AuthTokens> {
    const command = refreshSessionSchema.parse(input);

    return this.uow.execute(async (ctx) => {
      const presentedHash = await this.refreshTokenHasher.hash(command.refreshToken);
      const session = await ctx.sessions.findByRefreshTokenHash(presentedHash);
      if (!session) {
        throw new Error('Invalid refresh token');
      }

      const now = this.clock.now();
      if (!session.isActive(now)) {
        throw new Error('Session is not active');
      }

      const rawRefreshToken = RefreshToken.generate();
      const newRefreshTokenHash = await this.refreshTokenHasher.hash(rawRefreshToken.getValue());
      const expiresAt = new Date(now.getTime() + this.refreshTtlMs);

      session.refresh(newRefreshTokenHash, expiresAt, now);

      const accessToken = await this.tokenService.signAccessToken({
        sub: session.getUserId().toString(),
      });

      await ctx.sessions.save(session);
      await ctx.outbox.enqueue(session.getDomainEvents());
      session.clearDomainEvents();

      return {
        accessToken,
        refreshToken: rawRefreshToken.getValue(),
        sessionId: session.getId().toString(),
        expiresAt,
      };
    });
  }
}

export class LogoutHandler implements CommandHandler<LogoutCommand> {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly refreshTokenHasher: RefreshTokenHasherPort,
  ) {}

  async execute(input: LogoutCommand): Promise<void> {
    const command = logoutSchema.parse(input);

    await this.uow.execute(async (ctx) => {
      const presentedHash = await this.refreshTokenHasher.hash(command.refreshToken);
      const session = await ctx.sessions.findByRefreshTokenHash(presentedHash);
      if (!session) {
        return;
      }

      session.revoke();
      await ctx.sessions.save(session);
      await ctx.outbox.enqueue(session.getDomainEvents());
      session.clearDomainEvents();
    });
  }
}
