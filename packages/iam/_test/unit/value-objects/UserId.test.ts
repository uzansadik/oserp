// UserId.test.ts

import { UserId } from '@oserp-community/iam/domain/value-objects/UserId';
import { describe, expect, it } from 'vitest';

describe('UserId', () => {
  it('valid UUID ile UserId oluşturur', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';

    const userId = UserId.create(id);

    expect(userId).toBeInstanceOf(UserId);
  });

  it('geçersiz UUID gelirse hata fırlatır', () => {
    expect(() => UserId.create('invalid-id')).toThrow('userId must be a valid UUID');
  });

  it('generate UUID formatında UserId üretir', () => {
    const userId = UserId.generate();

    expect(userId.toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('aynı id değerine sahip iki UserId eşittir', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';

    const userId1 = UserId.create(id);
    const userId2 = UserId.create(id);

    expect(userId1.equals(userId2)).toBe(true);
  });

  it('farklı id değerine sahip iki UserId eşit değildir', () => {
    const userId1 = UserId.create('550e8400-e29b-41d4-a716-446655440000');
    const userId2 = UserId.create('7c9e6679-7425-40de-944b-e07fc1f90ae7');

    expect(userId1.equals(userId2)).toBe(false);
  });
});
