import 'server-only';

export type EnvSpecField = {
  key: string;
  description?: string;
  default?: string;
  generate?: 'password' | 'secret-hex' | 'secret-base64';
  optional?: boolean;
};

/**
 * Bir post-install step'i. İki varyant:
 *  - `migrate`: kendi image'ını `runOnce` ile çalıştırır (container başlatır, exit olur, loglar).
 *  - `seed-system-user`: backoffice kendisi HTTP POST yapar (kendi image çalıştırmaz).
 *    Çünkü mevcut `iam` container'ı zaten ayakta, ona doğrudan internal DNS
 *    (`http://iam:3000`) üzerinden ulaşılır. System user payload'ı step.payload
 *    alanında gelir (InstallInput.systemUser'dan).
 */
export type PostInstallStep =
  | {
      kind: 'migrate';
      image: string;
      tag: string;
      command: string[];
      envFromService: string;
    }
  | {
      kind: 'seed-system-user';
      /**
       * Hangi servise HTTP POST atılacak (sadece `iam` öngörülüyor).
       * Docker network içinde DNS olarak kullanılır: `http://{targetService}:{targetPort}`.
       */
      targetService: 'iam';
      targetPort: number;
      /** Backoffice → IAM relative path (örn. `/iam/users/bootstrap-register`). */
      endpointPath: string;
    };

export type CatalogEntry = {
  name: string;
  title: string;
  description: string;
  image: string;
  defaultTag: string;
  envSpec: EnvSpecField[];
  ports: Record<number, number>;
  volumes: string[];
  dependsOn: string[];
  postInstall: PostInstallStep[];
  internalEnvFromDeps?: Record<string, (deps: ResolvedDeps) => string>;
  /**
   * Container icinde dinlenen port. Edge (Caddy) reverse_proxy bu porta yapar.
   * undefined ise servis edge'e expose edilmez (yalnizca internal docker agi).
   */
  upstreamPort?: number;
};

export type ResolvedDeps = Record<string, { env: Record<string, string> }>;

export const NETWORK_NAME = 'oserp-net';

export const SERVICE_CATALOG = {
  postgres: {
    name: 'postgres',
    title: 'PostgreSQL',
    description: 'Birincil iliskisel veritabani. Tum oserp servisleri kullanir.',
    image: 'postgres',
    defaultTag: '16-bookworm',
    envSpec: [
      { key: 'POSTGRES_USER', default: 'oserp' },
      { key: 'POSTGRES_PASSWORD', generate: 'password' },
      { key: 'POSTGRES_DB', default: 'oserp' },
    ],
    ports: {},
    volumes: ['oserp-pgdata:/var/lib/postgresql/data'],
    dependsOn: [],
    postInstall: [],
  },
  iam: {
    name: 'iam',
    title: 'IAM API',
    description: 'Kimlik dogrulama, kullanici ve rol yonetimi (Fastify).',
    image: 'ghcr.io/uzansadik/oserp-api',
    defaultTag: 'latest',
    envSpec: [
      { key: 'JWT_SECRET', generate: 'secret-base64' },
      { key: 'JWT_ISSUER', default: 'oserp-community' },
      { key: 'NODE_ENV', default: 'production' },
      { key: 'HOST', default: '0.0.0.0' },
      { key: 'PORT', default: '3000' },
    ],
    ports: {},
    upstreamPort: 3000,
    volumes: [],
    dependsOn: ['postgres'],
    internalEnvFromDeps: {
      DATABASE_URL: (deps) => {
        const pg = deps.postgres;
        if (!pg) throw new Error('postgres bagimliligi cozulemedi.');
        const user = pg.env.POSTGRES_USER ?? 'oserp';
        const pass = pg.env.POSTGRES_PASSWORD ?? '';
        const db = pg.env.POSTGRES_DB ?? 'oserp';
        return `postgresql://${user}:${pass}@postgres:5432/${db}`;
      },
    },
    postInstall: [
      {
        kind: 'migrate',
        image: 'ghcr.io/uzansadik/oserp-api',
        tag: 'latest',
        command: ['node', 'dist/migrate.js'],
        envFromService: 'iam',
      },
      {
        kind: 'seed-system-user',
        targetService: 'iam',
        targetPort: 3000,
        // IAM Fastify router `/iam` prefix'iyle mount edildiği için path başına
        // `/iam` ekliyoruz. Asıl route: apps/api/src/app.ts → app.register(iamRouter, { prefix: '/iam' })
        endpointPath: '/iam/users/bootstrap-register',
      },
    ],
  },
} as const satisfies Record<string, CatalogEntry>;

export type CatalogKey = keyof typeof SERVICE_CATALOG;

export function getCatalogEntry(name: string): CatalogEntry | null {
  return (SERVICE_CATALOG as Record<string, CatalogEntry>)[name] ?? null;
}

export function listCatalog(): CatalogEntry[] {
  return Object.values(SERVICE_CATALOG);
}

export function resolveInstallOrder(target: string): string[] {
  const entry = getCatalogEntry(target);
  if (!entry) throw new Error(`Bilinmeyen servis: ${target}`);
  const visited = new Set<string>();
  const order: string[] = [];

  function walk(name: string, stack: string[]): void {
    if (visited.has(name)) return;
    if (stack.includes(name)) {
      throw new Error(`Dongusel bagimlilik: ${[...stack, name].join(' -> ')}`);
    }
    const node = getCatalogEntry(name);
    if (!node) throw new Error(`Bilinmeyen servis: ${name}`);
    for (const dep of node.dependsOn) {
      walk(dep, [...stack, name]);
    }
    visited.add(name);
    order.push(name);
  }

  walk(target, []);
  return order;
}
