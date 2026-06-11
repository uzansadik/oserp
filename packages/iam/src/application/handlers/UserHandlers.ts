import { MembershipAggregate } from '../../domain/aggregates/MembershipAggregate';
import { Permission } from '../../domain/entities/Permission';
import { Role } from '../../domain/entities/Role';
import { User } from '../../domain/entities/User';
import { UserCredential } from '../../domain/entities/UserCredential';
import { BootstrapNotAllowedError } from '../../domain/errors/errors';
import { UserPasswordChangedEvent } from '../../domain/events/UserPasswordChangedEvent';
import { CompanyId } from '../../domain/value-objects/CompanyId';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
import { PermissionCode } from '../../domain/value-objects/PermissionCode';
import { RoleName } from '../../domain/value-objects/RoleName';
import { UserId } from '../../domain/value-objects/UserId';
import { Username } from '../../domain/value-objects/Username';
import { UserStatus } from '../../domain/value-objects/UserStatus';
import {
  type ChangePasswordCommand,
  type ChangeUserStatusCommand,
  changePasswordSchema,
  changeUserStatusSchema,
  type RegisterUserCommand,
  registerUserSchema,
  type VerifyEmailCommand,
  verifyEmailSchema,
} from '../commands/UserCommands';
import type { CommandHandler } from '../Handler';
import type { PasswordHasherPort } from '../ports/PasswordHasherPort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';

export class RegisterUserHandler
  implements CommandHandler<RegisterUserCommand, { userId: string }>
{
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: RegisterUserCommand): Promise<{ userId: string }> {
    const command = registerUserSchema.parse(input);
    const email = Email.create(command.email);
    const username = Username.create(command.username);
    Password.create(command.password);

    return this.uow.execute(async (ctx) => {
      if (await ctx.users.existsByEmail(email)) {
        throw new Error('Email already in use');
      }
      if (await ctx.users.existsByUsername(username)) {
        throw new Error('Username already in use');
      }

      const user = User.create(
        null,
        command.name,
        command.surname,
        command.email,
        command.username,
      );
      const passwordHash = await this.hasher.hash(command.password);
      const credential = new UserCredential(user.id, passwordHash, new Date(), false);

      await ctx.users.save(user);
      await ctx.userCredentials.save(credential);
      await ctx.outbox.enqueue(user.getDomainEvents());
      user.clearDomainEvents();

      return { userId: user.id.toString() };
    });
  }
}

export class ChangePasswordHandler implements CommandHandler<ChangePasswordCommand> {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: ChangePasswordCommand): Promise<void> {
    const command = changePasswordSchema.parse(input);
    Password.create(command.newPassword);
    const userId = UserId.create(command.userId);

    await this.uow.execute(async (ctx) => {
      const credential = await ctx.userCredentials.findByUserId(userId);
      if (!credential) {
        throw new Error('User credential not found');
      }

      const matches = await this.hasher.verify(command.currentPassword, credential.getHash());
      if (!matches) {
        throw new Error('Current password is incorrect');
      }

      const newHash = await this.hasher.hash(command.newPassword);
      credential.changePassword(newHash);

      await ctx.userCredentials.save(credential);
      await ctx.outbox.enqueue([new UserPasswordChangedEvent(userId.toString())]);
    });
  }
}

export class VerifyEmailHandler implements CommandHandler<VerifyEmailCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: VerifyEmailCommand): Promise<void> {
    const command = verifyEmailSchema.parse(input);
    const userId = UserId.create(command.userId);

    await this.uow.execute(async (ctx) => {
      const user = await ctx.users.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const verified = user.verifyEmail();
      await ctx.users.save(verified);
      await ctx.outbox.enqueue(verified.getDomainEvents());
      verified.clearDomainEvents();
    });
  }
}

export class ChangeUserStatusHandler implements CommandHandler<ChangeUserStatusCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: ChangeUserStatusCommand): Promise<void> {
    const command = changeUserStatusSchema.parse(input);
    const userId = UserId.create(command.userId);
    const status = UserStatus.create(command.status);

    await this.uow.execute(async (ctx) => {
      const user = await ctx.users.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updated = user.changeStatus(status);
      await ctx.users.save(updated);
      await ctx.outbox.enqueue(updated.getDomainEvents());
      updated.clearDomainEvents();
    });
  }
}

/**
 * Sistem bootstrap icin kullanilan config.
 * - `defaultCompanyId`: sistem kullanicisinin uyelik alacagi placeholder company.
 *   Iliskisel bir `iam_companies` tablosu olmadigi icin sabit bir UUID kullaniliyor;
 *   ileride gercek company tablosu eklenince bu seed migrate edilebilir.
 */
export type BootstrapConfig = {
  defaultCompanyId: string;
};

/**
 * BootstrapRegisterUserHandler — auth-free, sadece bos DB iken calisir.
 *
 * Yapar:
 *  1. DB'de kullanici sayisini kontrol eder. count() > 0 → BootstrapNotAllowedError.
 *  2. RegisterUserHandler ile ayni sekilde User + UserCredential olusturur
 *     (email verified = true — sistem kullanicisi icin email dogrulama atlanir).
 *  3. `*.*.*` wildcard Permission'i seed eder (yoksa).
 *  4. `super-admin` sistem rolunu olusturur (yoksa) ve wildcard permission'i atar.
 *  5. Membership olusturur ve super-admin rolunu atar.
 *
 * Sonuc: `getEffectivePermissions(memberships, roles)` artik `['*.*.*']` doner;
 * PermissionEvaluator tüm `hasCode()` cagrilari icin true doner.
 */
export class BootstrapRegisterUserHandler
  implements CommandHandler<RegisterUserCommand, BootstrapRegisterUserResult>
{
  private static readonly WILDCARD_CODE = '*.*.*';
  private static readonly SYSTEM_ROLE_NAME = 'super-admin';

  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly hasher: PasswordHasherPort,
    private readonly config: BootstrapConfig,
  ) {}

  async execute(input: RegisterUserCommand): Promise<BootstrapRegisterUserResult> {
    const command = registerUserSchema.parse(input);
    const email = Email.create(command.email);
    const username = Username.create(command.username);
    Password.create(command.password);

    return this.uow.execute(async (ctx) => {
      // 1. Guard: bootstrap sadece bos DB iken calisir.
      if ((await ctx.users.count()) > 0) {
        throw new BootstrapNotAllowedError(
          'Bootstrap is only allowed on an empty database. The system has already been initialized.',
        );
      }

      if (await ctx.users.existsByEmail(email)) {
        throw new Error('Email already in use');
      }
      if (await ctx.users.existsByUsername(username)) {
        throw new Error('Username already in use');
      }

      // 2. User olustur (UserCreatedEvent uretilir)
      const user = User.create(
        null,
        command.name,
        command.surname,
        command.email,
        command.username,
      );
      const passwordHash = await this.hasher.hash(command.password);
      const credential = new UserCredential(user.id, passwordHash, new Date(), true);

      // Once User + UserCreatedEvent'i yaz, sonra email dogrulama event'i uret.
      await ctx.users.save(user);
      await ctx.userCredentials.save(credential);
      await ctx.outbox.enqueue(user.getDomainEvents());
      user.clearDomainEvents();

      // Email dogrula (sistem kullanicisi icin email dogrulama atlanir; otomatik verified)
      const verified = user.verifyEmail();
      await ctx.users.save(verified);
      await ctx.outbox.enqueue(verified.getDomainEvents());
      verified.clearDomainEvents();

      // 3. Wildcard permission seed (yoksa)
      const wildcardCode = PermissionCode.create(BootstrapRegisterUserHandler.WILDCARD_CODE);
      let permission = await ctx.permissions.findByCode(wildcardCode);
      if (!permission) {
        permission = Permission.create({
          module: '*',
          resource: '*',
          action: '*',
          description:
            'Wildcard — system user has all permissions (any module, any resource, any action)',
        });
        await ctx.permissions.save(permission);
      }

      // 4. super-admin sistem rolunu olustur (yoksa) ve permission ata
      const companyId = CompanyId.create(this.config.defaultCompanyId);
      const roleName = RoleName.create(
        BootstrapRegisterUserHandler.SYSTEM_ROLE_NAME,
        'Super Admin',
      );
      let role = await ctx.roles.findByCompany(companyId).then((rs) =>
        rs.find((r) => r.getName().value === roleName.value),
      );
      if (!role) {
        role = Role.create({
          name: roleName,
          companyId,
          description:
            'System role with wildcard permissions — assigned to the bootstrap system user.',
          isSystemRole: true,
        });
        await ctx.roles.save(role);
      }
      role.assignPermission(wildcardCode);
      await ctx.roles.save(role);
      await ctx.outbox.enqueue(role.getDomainEvents());
      role.clearDomainEvents();

      // 5. Membership olustur + super-admin rolunu ata
      const membership = MembershipAggregate.grant({
        userId: verified.id,
        companyId,
        roleIds: [role.getId()],
      });
      await ctx.memberships.save(membership);
      await ctx.outbox.enqueue(membership.getDomainEvents());
      membership.clearDomainEvents();

      return {
        userId: verified.id.toString(),
        membershipId: membership.getId().toString(),
        permissionCode: BootstrapRegisterUserHandler.WILDCARD_CODE,
      };
    });
  }
}

export type BootstrapRegisterUserResult = {
  userId: string;
  membershipId: string;
  /** Seed edilen wildcard permission kodu; debug/log icin. */
  permissionCode: string;
};
