import type { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { UserId } from '../../domain/value-objects/UserId';
import type { QueryHandler } from '../Handler';
import type { UserRepositoryPort } from '../ports/UserRepositoryPort';
import {
  type GetUserByEmailQuery,
  type GetUserByIdQuery,
  getUserByEmailSchema,
  getUserByIdSchema,
  type ListUsersQuery,
  type UserView,
} from '../queries/UserQueries';

function toUserView(user: User): UserView {
  return {
    id: user.id.toString(),
    fullName: user.person.value,
    email: user.email.value,
    username: user.userName.value,
    status: user.status.value,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class GetUserByIdHandler implements QueryHandler<GetUserByIdQuery, UserView | null> {
  constructor(private readonly users: UserRepositoryPort) {}

  async execute(query: GetUserByIdQuery): Promise<UserView | null> {
    const { userId } = getUserByIdSchema.parse(query);
    const user = await this.users.findById(UserId.create(userId));
    return user ? toUserView(user) : null;
  }
}

export class GetUserByEmailHandler implements QueryHandler<GetUserByEmailQuery, UserView | null> {
  constructor(private readonly users: UserRepositoryPort) {}

  async execute(query: GetUserByEmailQuery): Promise<UserView | null> {
    const { email } = getUserByEmailSchema.parse(query);
    const user = await this.users.findByEmail(Email.create(email));
    return user ? toUserView(user) : null;
  }
}

export class ListUsersHandler implements QueryHandler<ListUsersQuery, UserView[]> {
  constructor(private readonly users: UserRepositoryPort) {}

  async execute(_query: ListUsersQuery): Promise<UserView[]> {
    const users = await this.users.findAll();
    return users.map(toUserView);
  }
}
