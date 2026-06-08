import { ApiKeyPrefix } from '@oserp-community/iam/domain/value-objects/ApiKeyPrefix';
import { MembershipId } from '@oserp-community/iam/domain/value-objects/MembershipId';
import { RefreshToken } from '@oserp-community/iam/domain/value-objects/RefreshToken';
import { SessionId } from '@oserp-community/iam/domain/value-objects/SessionId';
import { TokenId } from '@oserp-community/iam/domain/value-objects/TokenId';
import { describe, expect, it } from 'vitest';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('SessionId', () => {
  it('generate ile gecerli UUID uretir', () => {
    expect(SessionId.generate().getValue()).toMatch(uuidPattern);
  });

  it('gecersiz id icin hata firlatir', () => {
    expect(() => SessionId.create('not-a-uuid')).toThrow('sessionId must be a valid UUID');
  });

  it('ayni id icin equals true doner', () => {
    const id = SessionId.generate().getValue();
    expect(SessionId.create(id).equals(SessionId.create(id))).toBe(true);
  });
});

describe('TokenId', () => {
  it('generate ile gecerli UUID uretir', () => {
    expect(TokenId.generate().getValue()).toMatch(uuidPattern);
  });

  it('gecersiz id icin hata firlatir', () => {
    expect(() => TokenId.create('bad')).toThrow('tokenId must be a valid UUID');
  });
});

describe('MembershipId', () => {
  it('generate ile gecerli UUID uretir', () => {
    expect(MembershipId.generate().getValue()).toMatch(uuidPattern);
  });

  it('gecersiz id icin hata firlatir', () => {
    expect(() => MembershipId.create('bad')).toThrow('membershipId must be a valid UUID');
  });
});

describe('RefreshToken', () => {
  it('generate ile bos olmayan token uretir', () => {
    expect(RefreshToken.generate().getValue().length).toBeGreaterThan(0);
  });

  it('bos token icin hata firlatir', () => {
    expect(() => RefreshToken.create('   ')).toThrow('Refresh token cannot be empty');
  });
});

describe('ApiKeyPrefix', () => {
  it('generate ile 8 karakterli prefix uretir', () => {
    expect(ApiKeyPrefix.generate().getValue()).toHaveLength(8);
  });

  it('gecersiz prefix icin hata firlatir', () => {
    expect(() => ApiKeyPrefix.create('short')).toThrow(
      'API key prefix must be 8 alphanumeric characters',
    );
  });
});
