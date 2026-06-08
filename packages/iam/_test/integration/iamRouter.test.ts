import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { iamRouter } from '../../src/api/iamRouter';
import { buildTestContainer } from '../support/buildTestContainer';
import type { InMemoryUnitOfWork } from '../support/InMemoryUnitOfWork';
import type { IamContainer } from '../../src/container';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const PASSWORD = 'Password123';

async function buildApp(container: IamContainer): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(iamRouter, { container });
  await app.ready();
  return app;
}

async function seedAuthorizedUser(
  container: IamContainer,
  permissionCode: string,
): Promise<{ userId: string; token: string }> {
  const parts = permissionCode.split('.') as [string, string, string];
  const { userId } = await container.commands.registerUser.execute({
    name: 'Ada',
    surname: 'Lovelace',
    email: `${permissionCode}@example.com`,
    username: `u${Date.now().toString().slice(-8)}`,
    password: PASSWORD,
  });
  await container.commands.createPermission.execute({
    module: parts[0],
    resource: parts[1],
    action: parts[2],
  });
  const { roleId } = await container.commands.createRole.execute({
    name: `role-${parts[1]}-${parts[2]}`,
    displayName: 'Test Role',
    companyId: COMPANY_ID,
  });
  await container.commands.assignPermissionToRole.execute({ roleId, permissionCode });
  await container.commands.grantMembership.execute({
    userId,
    companyId: COMPANY_ID,
    roleIds: [roleId],
  });
  const token = await container.adapters.tokenService.signAccessToken({
    sub: userId,
    companyId: COMPANY_ID,
  });
  return { userId, token };
}

describe('iamRouter (entegrasyon)', () => {
  let app: FastifyInstance;
  let container: IamContainer;
  let _uow: InMemoryUnitOfWork;

  beforeEach(async () => {
    const built = buildTestContainer();
    container = built.container;
    _uow = built.uow;
    app = await buildApp(container);
  });

  afterEach(async () => {
    await app.close();
  });

  it('gecersiz login govdesi 400 doner', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
  });

  it('auth basligi olmadan korumali uca 401 doner', async () => {
    const res = await app.inject({ method: 'GET', url: '/users' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('gecersiz token ile 401 doner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: 'Bearer not-a-valid-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('yetkili kullanici korumali uca 200 doner', async () => {
    const { token } = await seedAuthorizedUser(container, 'iam.user.list');
    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('izni olmayan kullanici 403 doner', async () => {
    const { token } = await seedAuthorizedUser(container, 'iam.role.read');
    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('gecerli kimlik bilgisiyle login token doner', async () => {
    await container.commands.registerUser.execute({
      name: 'Grace',
      surname: 'Hopper',
      email: 'grace@example.com',
      username: 'gracehopper',
      password: PASSWORD,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'grace@example.com', password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('accessToken');
    expect(res.json()).toHaveProperty('refreshToken');
  });

  it('hatali kimlik bilgisiyle login 401 doner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'yok@example.com', password: PASSWORD },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });
});
