import { User } from '../../domain/entities/User';
import { UserCredential } from '../../domain/entities/UserCredential';
import { UserPasswordChangedEvent } from '../../domain/events/UserPasswordChangedEvent';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
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
