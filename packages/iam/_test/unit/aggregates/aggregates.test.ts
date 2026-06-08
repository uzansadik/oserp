import { ApiCredentialAggregate } from '@oserp-community/iam/domain/aggregates/ApiCredentialAggregate';
import { MembershipAggregate } from '@oserp-community/iam/domain/aggregates/MembershipAggregate';
import { SessionAggregate } from '@oserp-community/iam/domain/aggregates/SessionAggregate';
import { ApiCredentialIssuedEvent } from '@oserp-community/iam/domain/events/ApiCredentialIssuedEvent';
import { MembershipGrantedEvent } from '@oserp-community/iam/domain/events/MembershipGrantedEvent';
import { SessionStartedEvent } from '@oserp-community/iam/domain/events/SessionStartedEvent';
import { ApiKeyPrefix } from '@oserp-community/iam/domain/value-objects/ApiKeyPrefix';
import { ApiKeySecretHash } from '@oserp-community/iam/domain/value-objects/ApiKeySecretHash';
import { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';
import { RoleId } from '@oserp-community/iam/domain/value-objects/RoleId';
import { UserId } from '@oserp-community/iam/domain/value-objects/UserId';
import { describe, expect, it } from 'vitest';

describe('MembershipAggregate', () => {
  it('grant ile MembershipGrantedEvent eklenir', () => {
    const m = MembershipAggregate.grant({
      userId: UserId.generate(),
      companyId: CompanyId.generate(),
    });
    expect(m.getStatus()).toBe('active');
    expect(m.getDomainEvents()[0]).toBeInstanceOf(MembershipGrantedEvent);
  });

  it('assignRole rol ekler, ayni rol tekrar eklenemez', () => {
    const m = MembershipAggregate.grant({
      userId: UserId.generate(),
      companyId: CompanyId.generate(),
    });
    const roleId = RoleId.generate();
    m.assignRole(roleId);
    expect(m.getRoleIds()).toContain(roleId.toString());
    expect(() => m.assignRole(roleId)).toThrow('already assigned');
  });

  it('suspended uyelige rol atanamaz', () => {
    const m = MembershipAggregate.grant({
      userId: UserId.generate(),
      companyId: CompanyId.generate(),
    });
    m.suspend();
    expect(() => m.assignRole(RoleId.generate())).toThrow('suspended');
  });
});

describe('SessionAggregate', () => {
  const future = () => new Date(Date.now() + 60_000);

  it('start ile SessionStartedEvent eklenir', () => {
    const s = SessionAggregate.start({
      userId: UserId.generate(),
      refreshTokenHash: 'hash',
      expiresAt: future(),
    });
    expect(s.isActive()).toBe(true);
    expect(s.getDomainEvents()[0]).toBeInstanceOf(SessionStartedEvent);
  });

  it('gecmis tarihli expiry ile baslatilamaz', () => {
    expect(() =>
      SessionAggregate.start({
        userId: UserId.generate(),
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).toThrow('future');
  });

  it('revoke sonrasi refresh edilemez', () => {
    const s = SessionAggregate.start({
      userId: UserId.generate(),
      refreshTokenHash: 'hash',
      expiresAt: future(),
    });
    s.revoke();
    expect(() => s.refresh('new', future())).toThrow('revoked');
  });
});

describe('ApiCredentialAggregate', () => {
  const make = () =>
    ApiCredentialAggregate.issue({
      companyId: CompanyId.generate(),
      name: 'CI key',
      prefix: ApiKeyPrefix.generate(),
      secretHash: ApiKeySecretHash.create('hash-value'),
    });

  it('issue ile ApiCredentialIssuedEvent eklenir', () => {
    const c = make();
    expect(c.isActive()).toBe(true);
    expect(c.getDomainEvents()[0]).toBeInstanceOf(ApiCredentialIssuedEvent);
  });

  it('revoke sonrasi rotate edilemez', () => {
    const c = make();
    c.revoke();
    expect(() => c.rotate(ApiKeySecretHash.create('new-hash'))).toThrow('revoked');
  });
});
