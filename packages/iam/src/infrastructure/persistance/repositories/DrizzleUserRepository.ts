import type { UserRepositoryPort } from '@oserp-community/iam/application/ports/UserRepositoryPort';
import type { User } from '@oserp-community/iam/domain/entities/User';
import type { Email } from '@oserp-community/iam/domain/value-objects/Email';
import type { UserId } from '@oserp-community/iam/domain/value-objects/UserId';
import type { Username } from '@oserp-community/iam/domain/value-objects/Username';
import { count, eq } from 'drizzle-orm';
import type { IamDbClient } from '../db';
import { userToDomain, userToPersistence } from '../mappers/UserMapper';
import { iamUsers } from '../schemas/iam.user.schema';

export class DrizzleUserRepository implements UserRepositoryPort {
  constructor(private readonly db: IamDbClient) {}

  async save(user: User): Promise<void> {
    const data = userToPersistence(user);
    await this.db
      .insert(iamUsers)
      .values(data)
      .onConflictDoUpdate({
        target: iamUsers.id,
        set: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          username: data.username,
          status: data.status,
          isEmailVerified: data.isEmailVerified,
          updatedAt: data.updatedAt,
        },
      });
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await this.db.query.iamUsers.findFirst({
      where: eq(iamUsers.id, id.toString()),
    });
    return row ? userToDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.db.query.iamUsers.findFirst({
      where: eq(iamUsers.email, email.value),
    });
    return row ? userToDomain(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const row = await this.db.query.iamUsers.findFirst({
      where: eq(iamUsers.username, username.value),
    });
    return row ? userToDomain(row) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }

  async existsByUsername(username: Username): Promise<boolean> {
    return (await this.findByUsername(username)) !== null;
  }

  async count(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(iamUsers);
    return row?.value ?? 0;
  }

  async findAll(): Promise<User[]> {
    const rows = await this.db.query.iamUsers.findMany();
    return rows.map(userToDomain);
  }
}
