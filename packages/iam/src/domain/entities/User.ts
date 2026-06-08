import { UserCreatedEvent } from '@oserp-community/iam/domain/events/UserCreatedEvent';
import { UserEmailVerifiedEvent } from '@oserp-community/iam/domain/events/UserEmailVerifiedEvent';
import { UserStatusChangedEvent } from '@oserp-community/iam/domain/events/UserStatusChangedEvent';
import { Email, Person, UserId, Username } from '@oserp-community/iam/domain/value-objects';
import { UserStatus } from '../value-objects/UserStatus';
import { AggregateRoot } from './AggregateRoot';

export class User extends AggregateRoot {
  private constructor(
    public readonly id: UserId,
    public readonly person: Person,
    public readonly email: Email,
    public readonly userName: Username,
    public readonly status: UserStatus,
    public readonly isEmailVerified: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    super();
  }

  static create(
    id: string | null,
    name: string,
    surname: string,
    email: string,
    userName: string,
  ): User {
    if (!email || email.trim() === '') {
      throw new Error('Email cannot be empty');
    }
    if (!userName || userName.trim() === '') {
      throw new Error('UserName cannot be empty');
    }

    const person = Person.create(name, surname);
    const userId = id === null ? UserId.generate() : UserId.create(id);
    const now = new Date();

    const user = new User(
      userId,
      person,
      Email.create(email),
      Username.create(userName),
      UserStatus.create('active'),
      false,
      now,
      now,
    );

    user.addDomainEvent(new UserCreatedEvent(user.id.toString(), email, person.value));

    return user;
  }

  static reconstitute(props: {
    id: string;
    name: string;
    surname: string;
    email: string;
    username: string;
    status: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      UserId.create(props.id),
      Person.create(props.name, props.surname),
      Email.create(props.email),
      Username.create(props.username),
      UserStatus.create(props.status),
      props.isEmailVerified,
      props.createdAt,
      props.updatedAt,
    );
  }

  updateName(name: string, surname: string): User {
    const newPerson = Person.create(name, surname);
    if (this.person.value === newPerson.value) {
      throw new Error('New name is the same as the current name');
    }
    return new User(
      this.id,
      newPerson,
      this.email,
      this.userName,
      this.status,
      this.isEmailVerified,
      this.createdAt,
      new Date(),
    );
  }

  updateEmail(email: string): User {
    if (!email || email.trim() === '') {
      throw new Error('Email cannot be empty');
    }
    const newEmail = Email.create(email);
    if (this.email.value === newEmail.value) {
      throw new Error('New email is the same as the current email');
    }
    return new User(
      this.id,
      this.person,
      newEmail,
      this.userName,
      this.status,
      this.isEmailVerified,
      this.createdAt,
      new Date(),
    );
  }

  updateUserName(userName: string): User {
    if (!userName || userName.trim() === '') {
      throw new Error('Username cannot be empty');
    }
    const newUserName = Username.create(userName);
    if (this.userName.value === newUserName.value) {
      throw new Error('New username is the same as the current username');
    }
    return new User(
      this.id,
      this.person,
      this.email,
      newUserName,
      this.status,
      this.isEmailVerified,
      this.createdAt,
      new Date(),
    );
  }

  verifyEmail(): User {
    if (this.isEmailVerified) {
      throw new Error('Email is already verified');
    }
    const user = new User(
      this.id,
      this.person,
      this.email,
      this.userName,
      this.status,
      true,
      this.createdAt,
      new Date(),
    );
    user.addDomainEvent(new UserEmailVerifiedEvent(this.id.toString()));
    return user;
  }

  changeStatus(status: UserStatus): User {
    if (this.status.equals(status)) {
      throw new Error('New status is the same as the current status');
    }
    const user = new User(
      this.id,
      this.person,
      this.email,
      this.userName,
      status,
      this.isEmailVerified,
      this.createdAt,
      new Date(),
    );
    user.addDomainEvent(
      new UserStatusChangedEvent(this.id.toString(), this.status.value, status.value),
    );
    return user;
  }

  activate(): User {
    return this.changeStatus(UserStatus.active());
  }

  deactivate(): User {
    return this.changeStatus(UserStatus.inactive());
  }

  suspend(): User {
    return this.changeStatus(UserStatus.suspended());
  }

  getLastUpdatedAt(): Date {
    return this.updatedAt;
  }
}
