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
import type { CommandHandler, QueryHandler } from '../Handler';
import type { GetEffectivePermissionsHandler } from './RoleQueryHandlers';
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

/**
 * Login sırasında JWT'e yazılacak permission'ları hesaplamak için kullanılan
 * query handler. Membership → rol → permissionCodes zincirini çözer.
 *
 * Container tarafından inject edilir; handler'ın transaction'ın dışında
 * çalışması gerekir (authenticate middleware'i token'ı doğruladıktan sonra
 * kullanır), bu yüzden uow dışı sorgu yapar.
 */
export type EffectivePermissionsProvider = Pick<
  GetEffectivePermissionsHandler,
  'execute'
>;

export class LoginHandler implements CommandHandler<LoginCommand, AuthTokens> {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly refreshTokenHasher: RefreshTokenHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly clock: ClockPort,
    private readonly getEffectivePermissions: EffectivePermissionsProvider,
    config: AuthHandlerConfig = {},
  ) {
    this.refreshTtlMs = config.refreshTokenTtlMs ?? DEFAULT_REFRESH_TTL_MS;
  }

  async execute(input: LoginCommand): Promise<AuthTokens> {
    const command = loginSchema.parse(input);
    const email = Email.create(command.email);

    // Tx içinde: user doğrula, credential kontrol et, session oluştur, raw token üret.
    // Membership'ten companyId'yi tx içinde oku (db zaten açık).
    const result = await this.uow.execute(async (ctx) => {
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

      // Aktif membership'in companyId'sini bul; yoksa token boş permissions taşır.
      const memberships = await ctx.memberships.findByUser(user.id);
      const activeMembership = memberships.find((m) => m.getStatus() === 'active') ?? null;
      const companyId = activeMembership ? activeMembership.getCompanyId().toString() : null;

      const now = this.clock.now();
      const rawRefreshToken = RefreshToken.generate();
      const refreshTokenHash = await this.refreshTokenHasher.hash(rawRefreshToken.getValue());
      const expiresAt = new Date(now.getTime() + this.refreshTtlMs);

      const session = SessionAggregate.start({
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      });

      await ctx.sessions.save(session);
      await ctx.outbox.enqueue(session.getDomainEvents());
      session.clearDomainEvents();

      return {
        userId: user.id.toString(),
        companyId,
        refreshToken: rawRefreshToken.getValue(),
        sessionId: session.getId().toString(),
        expiresAt,
      };
    });

    // Tx dışında: effective permissions hesapla, JWT'i imzala.
    // Hata olursa boş array düşer; token hâlâ geçerli, sadece auth check'leri
    // başarısız olur — login'i kırmamak için tasarım.
    let permissions: string[] = [];
    if (result.companyId) {
      try {
        const perms = await this.getEffectivePermissions.execute({
          userId: result.userId,
          companyId: result.companyId,
        });
        permissions = perms.permissionCodes;
      } catch {
        permissions = [];
      }
    }

    const accessToken = await this.tokenService.signAccessToken({
      sub: result.userId,
      ...(result.companyId ? { companyId: result.companyId } : {}),
      permissions,
    });

    return {
      accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
    };
  }
}

export class RefreshSessionHandler implements CommandHandler<RefreshSessionCommand, AuthTokens> {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly refreshTokenHasher: RefreshTokenHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly clock: ClockPort,
    private readonly getEffectivePermissions: EffectivePermissionsProvider,
    config: AuthHandlerConfig = {},
  ) {
    this.refreshTtlMs = config.refreshTokenTtlMs ?? DEFAULT_REFRESH_TTL_MS;
  }

  async execute(input: RefreshSessionCommand): Promise<AuthTokens> {
    const command = refreshSessionSchema.parse(input);

    const result = await this.uow.execute(async (ctx) => {
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

      await ctx.sessions.save(session);
      await ctx.outbox.enqueue(session.getDomainEvents());
      session.clearDomainEvents();

      // Refresh sırasında da aktif membership'i bul (login'deki ile aynı mantık).
      const memberships = await ctx.memberships.findByUser(session.getUserId());
      const activeMembership = memberships.find((m) => m.getStatus() === 'active') ?? null;
      const companyId = activeMembership ? activeMembership.getCompanyId().toString() : null;

      return {
        userId: session.getUserId().toString(),
        companyId,
        refreshToken: rawRefreshToken.getValue(),
        sessionId: session.getId().toString(),
        expiresAt,
      };
    });

    let permissions: string[] = [];
    if (result.companyId) {
      try {
        const perms = await this.getEffectivePermissions.execute({
          userId: result.userId,
          companyId: result.companyId,
        });
        permissions = perms.permissionCodes;
      } catch {
        permissions = [];
      }
    }

    const accessToken = await this.tokenService.signAccessToken({
      sub: result.userId,
      ...(result.companyId ? { companyId: result.companyId } : {}),
      permissions,
    });

    return {
      accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
    };
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
