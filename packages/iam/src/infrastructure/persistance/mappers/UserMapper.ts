import { User } from '@oserp-community/iam/domain/entities/User';

export type UserPersistenceModel = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function userToPersistence(user: User): UserPersistenceModel {
  return {
    id: user.id.toString(),
    firstName: user.person.firstName,
    lastName: user.person.lastName,
    email: user.email.value,
    username: user.userName.value,
    status: user.status.value,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function userToDomain(row: UserPersistenceModel): User {
  return User.reconstitute({
    id: row.id,
    name: row.firstName,
    surname: row.lastName,
    email: row.email,
    username: row.username,
    status: row.status,
    isEmailVerified: row.isEmailVerified,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
