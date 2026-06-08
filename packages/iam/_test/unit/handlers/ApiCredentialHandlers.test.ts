import {
  IssueApiCredentialHandler,
  RevokeApiCredentialHandler,
  RotateApiCredentialHandler,
} from '@oserp-community/iam/application/handlers/ApiCredentialHandlers';
import { ApiCredentialIssuedEvent } from '@oserp-community/iam/domain/events/ApiCredentialIssuedEvent';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeApiKeySecretHasher, InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

describe('IssueApiCredentialHandler', () => {
  let uow: InMemoryUnitOfWork;
  let handler: IssueApiCredentialHandler;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    handler = new IssueApiCredentialHandler(uow, new FakeApiKeySecretHasher());
  });

  it('yeni api kimligi olusturur ve duz metin anahtar doner', async () => {
    const result = await handler.execute({ companyId: COMPANY_ID, name: 'CI Bot' });

    expect(uow.apiCredentials.store.has(result.apiKeyId)).toBe(true);
    expect(result.apiKey).toBe(`${result.prefix}.${result.apiKey.split('.')[1]}`);
    expect(result.apiKey.startsWith(`${result.prefix}.`)).toBe(true);
    expect(uow.outbox.events[0]).toBeInstanceOf(ApiCredentialIssuedEvent);
  });

  it('uretilen anahtarin gizli kismi hashlenerek saklanir', async () => {
    const result = await handler.execute({ companyId: COMPANY_ID, name: 'CI Bot' });
    const rawSecret = result.apiKey.split('.')[1]!;
    const stored = uow.apiCredentials.store.get(result.apiKeyId)!;

    expect(stored.getSecretHash().getValue()).toBe(`secret:${rawSecret}`);
  });
});

describe('RotateApiCredentialHandler', () => {
  it('gizli anahtari yeniler ve yeni anahtar doner', async () => {
    const uow = new InMemoryUnitOfWork();
    const hasher = new FakeApiKeySecretHasher();
    const { apiKeyId, apiKey } = await new IssueApiCredentialHandler(uow, hasher).execute({
      companyId: COMPANY_ID,
      name: 'CI Bot',
    });
    const oldHash = uow.apiCredentials.store.get(apiKeyId)!.getSecretHash().getValue();

    const rotated = await new RotateApiCredentialHandler(uow, hasher).execute({ apiKeyId });

    expect(rotated.apiKey).not.toBe(apiKey);
    expect(rotated.prefix).toBe(apiKey.split('.')[0]);
    expect(uow.apiCredentials.store.get(apiKeyId)!.getSecretHash().getValue()).not.toBe(oldHash);
    expect(uow.apiCredentials.store.get(apiKeyId)!.getLastRotatedAt()).not.toBeNull();
  });

  it('var olmayan kimlik icin hata firlatir', async () => {
    const uow = new InMemoryUnitOfWork();
    await expect(
      new RotateApiCredentialHandler(uow, new FakeApiKeySecretHasher()).execute({
        apiKeyId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toThrow('API credential not found');
  });
});

describe('RevokeApiCredentialHandler', () => {
  it('api kimligini iptal eder', async () => {
    const uow = new InMemoryUnitOfWork();
    const { apiKeyId } = await new IssueApiCredentialHandler(uow, new FakeApiKeySecretHasher()).execute(
      { companyId: COMPANY_ID, name: 'CI Bot' },
    );

    await new RevokeApiCredentialHandler(uow).execute({ apiKeyId });

    expect(uow.apiCredentials.store.get(apiKeyId)!.getStatus()).toBe('revoked');
    expect(uow.apiCredentials.store.get(apiKeyId)!.isActive()).toBe(false);
  });

  it('var olmayan kimlik icin hata firlatir', async () => {
    const uow = new InMemoryUnitOfWork();
    await expect(
      new RevokeApiCredentialHandler(uow).execute({
        apiKeyId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toThrow('API credential not found');
  });
});
