import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { getCatalogEntry, NETWORK_NAME } from '../catalog';
import { DockerService } from '../docker';
import { type BackofficeContext, getContext } from '../index';
import { type BuildCaddyfileInput, buildCaddyfile } from './caddy-config';

export const EDGE_CONTAINER_NAME = 'oserp-edge';
export const EDGE_IMAGE = 'caddy';
export const EDGE_TAG = '2-alpine';
export const BACKOFFICE_INTERNAL_PORT = 8000;

/**
 * Backoffice container icindeki /data ile host'taki veri dizini ayni volume'a
 * map edilir. Caddyfile'i host'tan goren Caddy container'i icin host yolu
 * gerekir. install.sh `BACKOFFICE_HOST_DATA_DIR` env'ini set eder.
 */
function resolveHostDataDir(): string {
  return process.env['BACKOFFICE_HOST_DATA_DIR'] ?? '/var/lib/oserp-backoffice';
}

function resolveContainerDataDir(): string {
  return process.env['BACKOFFICE_DATA_DIR'] ?? '/data';
}

function resolveBackofficeContainerName(): string {
  return process.env['BACKOFFICE_CONTAINER_NAME'] ?? 'oserp-backoffice';
}

function caddyfilePathOnHost(): string {
  return join(resolveHostDataDir(), 'caddy', 'Caddyfile');
}

function caddyDataPathOnHost(): string {
  return join(resolveHostDataDir(), 'caddy', 'data');
}

function caddyConfigDirOnHost(): string {
  return join(resolveHostDataDir(), 'caddy');
}
export class EdgeManager {
  constructor(
    private readonly ctx: BackofficeContext,
    private readonly docker: DockerService,
  ) {}

  static async create(): Promise<EdgeManager> {
    return new EdgeManager(await getContext(), new DockerService());
  }

  async getDesiredConfig(): Promise<BuildCaddyfileInput> {
    const edge = await this.ctx.edgeConfig.get();
    const services = await this.ctx.services.list();
    return {
      backoffice: {
        name: resolveBackofficeContainerName(),
        upstreamPort: BACKOFFICE_INTERNAL_PORT,
        domain: edge.domain,
        tlsMode: edge.tlsMode,
      },
      services: services.map((row) => {
        const catalogEntry = getCatalogEntry(row.name);
        const upstreamPort = row.upstreamPort ?? catalogEntry?.upstreamPort ?? null;
        return {
          name: row.name,
          domain: row.domain,
          tlsMode: row.tlsMode,
          upstreamPort,
        };
      }),
      acmeEmail: edge.acmeEmail,
    };
  }

  async writeConfig(): Promise<string> {
    const input = await this.getDesiredConfig();
    const content = buildCaddyfile(input);
    const path = join(resolveContainerDataDir(), 'caddy', 'Caddyfile');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
    return content;
  }

  /**
   * Edge container'i yoksa olusturur. Var olan durumunu kontrol eder; image/tag
   * eskidir veya container yoksa yeniden olusturur. Idempotent.
   */
  async ensureContainer(): Promise<{ created: boolean }> {
    if (!isEdgeEnabled()) return { created: false };

    await this.docker.ensureNetwork(NETWORK_NAME);
    await this.writeConfig();

    const status = await this.docker.getContainerStatus(EDGE_CONTAINER_NAME);
    if (status.exists && status.running) {
      // Backoffice container'inin edge ile ayni agda oldugundan emin ol.
      await this.docker.ensureContainerOnNetwork(resolveBackofficeContainerName(), NETWORK_NAME);
      return { created: false };
    }

    // Caddy imajini cek (yoksa).
    await this.docker.pullImage(EDGE_IMAGE, EDGE_TAG);

    const hostConfigDir = caddyConfigDirOnHost();
    const hostDataDir = caddyDataPathOnHost();

    if (!isAbsolute(hostConfigDir)) {
      throw new Error(`BACKOFFICE_HOST_DATA_DIR mutlak yol olmali: ${hostConfigDir}`);
    }

    await this.docker.runContainer({
      name: EDGE_CONTAINER_NAME,
      image: EDGE_IMAGE,
      tag: EDGE_TAG,
      ports: { 80: 80, 443: 443 },
      volumes: [`${hostConfigDir}:/etc/caddy:ro`, `${hostDataDir}:/data`],
      network: NETWORK_NAME,
      restart: 'unless-stopped',
      labels: {
        'oserp.edge.role': 'reverse-proxy',
      },
      command: ['caddy', 'run', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'],
    });

    await this.docker.ensureContainerOnNetwork(resolveBackofficeContainerName(), NETWORK_NAME);
    return { created: true };
  }

  /**
   * Caddyfile'i yeniden uretir ve calisan Caddy container'inda `caddy reload`
   * komutunu calistirir. Container yoksa sessizce no-op.
   */
  async reload(): Promise<{ reloaded: boolean; reason?: string }> {
    if (!isEdgeEnabled()) return { reloaded: false, reason: 'edge_disabled' };

    await this.writeConfig();
    const status = await this.docker.getContainerStatus(EDGE_CONTAINER_NAME);
    if (!status.exists) return { reloaded: false, reason: 'edge_missing' };
    if (!status.running) return { reloaded: false, reason: 'edge_stopped' };

    const result = await this.docker.execInContainer(EDGE_CONTAINER_NAME, [
      'caddy',
      'reload',
      '--config',
      '/etc/caddy/Caddyfile',
      '--adapter',
      'caddyfile',
    ]);
    if (result.exitCode !== 0) {
      throw new Error(
        `Caddy reload basarisiz (exit ${result.exitCode}): ${result.stderr || result.stdout}`,
      );
    }
    return { reloaded: true };
  }

  /**
   * ensureContainer + reload. Servis/domain degisikliklerinde cagirilir.
   */
  async sync(): Promise<{ created: boolean; reloaded: boolean }> {
    const ensure = await this.ensureContainer();
    if (ensure.created) {
      // Yeni olusturuldu, reload gerekmez (caddy run zaten Caddyfile'i yukledi).
      return { created: true, reloaded: false };
    }
    const reload = await this.reload();
    return { created: false, reloaded: reload.reloaded };
  }
}

export function isEdgeEnabled(): boolean {
  const raw = process.env['EDGE_ENABLED'];
  if (raw === undefined) return true;
  return raw === '1' || raw.toLowerCase() === 'true';
}

export { caddyConfigDirOnHost, caddyDataPathOnHost, caddyfilePathOnHost };
