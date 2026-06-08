import { User } from '@oserp-community/iam/domain/entities/User';
import { UserEmailVerifiedEvent } from '@oserp-community/iam/domain/events/UserEmailVerifiedEvent';
import { UserStatusChangedEvent } from '@oserp-community/iam/domain/events/UserStatusChangedEvent';
import { describe, expect, it } from 'vitest';

const make = () =>
  User.create('550e8400-e29b-41d4-a716-446655440000', 'Ahmet', 'Yilmaz', 'a@example.com', 'ahmety');

describe('User davranislari', () => {
  it('verifyEmail ile email dogrulanir ve event eklenir', () => {
    const user = make().verifyEmail();

    expect(user.isEmailVerified).toBe(true);
    const event = user.getDomainEvents().at(-1);
    expect(event).toBeInstanceOf(UserEmailVerifiedEvent);
  });

  it('zaten dogrulanmis email tekrar dogrulanamaz', () => {
    const user = make().verifyEmail();
    expect(() => user.verifyEmail()).toThrow('Email is already verified');
  });

  it('suspend ile status degisir ve UserStatusChangedEvent eklenir', () => {
    const user = make().suspend();

    expect(user.status.value).toBe('suspended');
    const event = user.getDomainEvents().at(-1) as UserStatusChangedEvent;
    expect(event).toBeInstanceOf(UserStatusChangedEvent);
    expect(event.previousStatus).toBe('active');
    expect(event.newStatus).toBe('suspended');
  });

  it('ayni status verildiginde hata firlatir', () => {
    expect(() => make().activate()).toThrow('New status is the same as the current status');
  });
});
