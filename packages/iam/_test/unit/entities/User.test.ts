import { User } from '@oserp-community/iam/domain/entities/User';
import { UserCreatedEvent } from '@oserp-community/iam/domain/events/UserCreatedEvent';
import { describe, expect, it } from 'vitest';

describe('User', () => {
  const validId = '550e8400-e29b-41d4-a716-446655440000';
  const validName = 'Ahmet';
  const validSurname = 'Yilmaz';
  const validEmail = 'ahmet.yilmaz@example.com';
  const validUsername = 'ahmety';

  it('verilen id ile User olusturur ve UserCreatedEvent ekler', () => {
    const user = User.create(validId, validName, validSurname, validEmail, validUsername);

    expect(user.id.toString()).toBe(validId);
    expect(user.person.value).toBe(`${validName} ${validSurname}`);
    expect(user.email.value).toBe(validEmail);
    expect(user.userName.value).toBe(validUsername);

    const events = user.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserCreatedEvent);

    const createdEvent = events[0] as UserCreatedEvent;
    expect(createdEvent.userId).toBe(validId);
    expect(createdEvent.email).toBe(validEmail);
  });

  it('id null geldiginde UUID uretir', () => {
    const user = User.create(null, validName, validSurname, validEmail, validUsername);

    expect(user.id.toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(user.getDomainEvents()).toHaveLength(1);
  });

  it('isim bos ise hata firlatir', () => {
    expect(() => User.create(validId, '', validSurname, validEmail, validUsername)).toThrow(
      'Name cannot be empty',
    );
  });

  it('soyisim bos ise hata firlatir', () => {
    expect(() => User.create(validId, validName, '', validEmail, validUsername)).toThrow(
      'Surname cannot be empty',
    );
  });

  it('email bos ise hata firlatir', () => {
    expect(() => User.create(validId, validName, validSurname, '', validUsername)).toThrow(
      'Email cannot be empty',
    );
  });

  it('username bos ise hata firlatir', () => {
    expect(() => User.create(validId, validName, validSurname, validEmail, '')).toThrow(
      'UserName cannot be empty',
    );
  });

  it('updateName farkli deger geldiginde yeni User doner', () => {
    const user = User.create(validId, validName, validSurname, validEmail, validUsername);

    const updated = user.updateName('Mehmet', 'Demir');

    expect(updated).not.toBe(user);
    expect(updated.person.value).toBe('Mehmet Demir');
    expect(updated.id.toString()).toBe(user.id.toString());
    expect(updated.email.value).toBe(user.email.value);
    expect(updated.userName.value).toBe(user.userName.value);
  });

  it('updateName ayni deger geldiginde hata firlatir', () => {
    const user = User.create(validId, validName, validSurname, validEmail, validUsername);

    expect(() => user.updateName(validName, validSurname)).toThrow(
      'New name is the same as the current name',
    );
  });

  it('updateEmail farkli deger geldiginde yeni User doner', () => {
    const user = User.create(validId, validName, validSurname, validEmail, validUsername);

    const updated = user.updateEmail('mehmet.demir@example.com');

    expect(updated).not.toBe(user);
    expect(updated.email.value).toBe('mehmet.demir@example.com');
    expect(updated.id.toString()).toBe(user.id.toString());
    expect(updated.person.value).toBe(user.person.value);
    expect(updated.userName.value).toBe(user.userName.value);
  });

  it('updateEmail ayni deger geldiginde hata firlatir', () => {
    const user = User.create(validId, validName, validSurname, validEmail, validUsername);

    expect(() => user.updateEmail(validEmail)).toThrow(
      'New email is the same as the current email',
    );
  });

  it('updateUserName farkli deger geldiginde yeni User doner', () => {
    const user = User.create(validId, validName, validSurname, validEmail, validUsername);

    const updated = user.updateUserName('mehmetd');

    expect(updated).not.toBe(user);
    expect(updated.userName.value).toBe('mehmetd');
    expect(updated.id.toString()).toBe(user.id.toString());
    expect(updated.person.value).toBe(user.person.value);
    expect(updated.email.value).toBe(user.email.value);
  });

  it('updateUserName ayni deger geldiginde hata firlatir', () => {
    const user = User.create(validId, validName, validSurname, validEmail, validUsername);

    expect(() => user.updateUserName(validUsername)).toThrow(
      'New username is the same as the current username',
    );
  });
});
