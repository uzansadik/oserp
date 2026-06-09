import 'server-only';
import type { Readable } from 'node:stream';

import type Docker from 'dockerode';

import { getDocker } from './client';

export type ContainerStatus = {
  exists: boolean;
  running: boolean;
  state: string | null;
  status: string | null;
  image: string | null;
  startedAt: string | null;
  ports: Array<{ host: number | null; container: number; protocol: string }>;
};

export type DaemonInfo = {
  reachable: boolean;
  version: string | null;
  apiVersion: string | null;
  containers: number | null;
  images: number | null;
  os: string | null;
  arch: string | null;
  error?: string;
};

export type RunContainerSpec = {
  name: string;
  image: string;
  tag: string;
  env?: Record<string, string>;
  ports?: Record<number, number>;
  volumes?: string[];
  network?: string;
  command?: string[];
  restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  labels?: Record<string, string>;
};

export type PullProgress = {
  status: string;
  id?: string;
  progress?: string;
  percent?: number;
};

const LABEL_MANAGED_BY = 'oserp.backoffice.managed';

export class DockerService {
  constructor(private readonly docker: Docker = getDocker()) {}

  async pingDaemon(): Promise<DaemonInfo> {
    try {
      const version = await this.docker.version();
      const info = await this.docker.info();
      return {
        reachable: true,
        version: version.Version ?? null,
        apiVersion: version.ApiVersion ?? null,
        containers: info.Containers ?? null,
        images: info.Images ?? null,
        os: info.OperatingSystem ?? null,
        arch: info.Architecture ?? null,
      };
    } catch (err) {
      return {
        reachable: false,
        version: null,
        apiVersion: null,
        containers: null,
        images: null,
        os: null,
        arch: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async pullImage(
    image: string,
    tag: string,
    onProgress?: (event: PullProgress) => void,
  ): Promise<void> {
    const ref = `${image}:${tag}`;
    const stream = (await this.docker.pull(ref)) as Readable;
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err) => (err ? reject(err) : resolve()),
        (event: PullProgress & { progressDetail?: { current?: number; total?: number } }) => {
          if (!onProgress) return;
          let percent: number | undefined;
          const detail = event.progressDetail;
          if (detail && typeof detail.current === 'number' && typeof detail.total === 'number' && detail.total > 0) {
            percent = Math.round((detail.current / detail.total) * 100);
          }
          onProgress({
            status: event.status,
            ...(event.id !== undefined ? { id: event.id } : {}),
            ...(event.progress !== undefined ? { progress: event.progress } : {}),
            ...(percent !== undefined ? { percent } : {}),
          });
        },
      );
    });
  }

  async getContainerStatus(name: string): Promise<ContainerStatus> {
    try {
      const container = this.docker.getContainer(name);
      const data = await container.inspect();
      const ports: ContainerStatus['ports'] = [];
      const portBindings = data.NetworkSettings?.Ports ?? {};
      for (const [key, bindings] of Object.entries(portBindings)) {
        const [portStr, protocol] = key.split('/');
        const containerPort = Number(portStr);
        if (Number.isNaN(containerPort)) continue;
        if (bindings && bindings.length > 0) {
          for (const b of bindings) {
            ports.push({
              host: b.HostPort ? Number(b.HostPort) : null,
              container: containerPort,
              protocol: protocol ?? 'tcp',
            });
          }
        } else {
          ports.push({ host: null, container: containerPort, protocol: protocol ?? 'tcp' });
        }
      }
      return {
        exists: true,
        running: data.State?.Running ?? false,
        state: data.State?.Status ?? null,
        status: data.State?.Status ?? null,
        image: data.Config?.Image ?? null,
        startedAt: data.State?.StartedAt ?? null,
        ports,
      };
    } catch (err) {
      if (isNotFound(err)) {
        return {
          exists: false,
          running: false,
          state: null,
          status: null,
          image: null,
          startedAt: null,
          ports: [],
        };
      }
      throw err;
    }
  }

  async runContainer(spec: RunContainerSpec): Promise<string> {
    await this.removeContainer(spec.name, { ignoreMissing: true });

    const env = spec.env
      ? Object.entries(spec.env).map(([k, v]) => `${k}=${v}`)
      : undefined;

    const exposedPorts: Record<string, Record<string, never>> = {};
    const portBindings: Record<string, Array<{ HostPort: string }>> = {};
    if (spec.ports) {
      for (const [containerPortStr, hostPort] of Object.entries(spec.ports)) {
        const key = `${containerPortStr}/tcp`;
        exposedPorts[key] = {};
        portBindings[key] = [{ HostPort: String(hostPort) }];
      }
    }

    const created = await this.docker.createContainer({
      name: spec.name,
      Image: `${spec.image}:${spec.tag}`,
      ...(env ? { Env: env } : {}),
      ...(spec.command ? { Cmd: spec.command } : {}),
      Labels: {
        [LABEL_MANAGED_BY]: 'true',
        'oserp.backoffice.service': spec.name,
        ...(spec.labels ?? {}),
      },
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: portBindings,
        ...(spec.volumes ? { Binds: spec.volumes } : {}),
        ...(spec.network ? { NetworkMode: spec.network } : {}),
        RestartPolicy: { Name: spec.restart ?? 'unless-stopped' },
      },
    });
    await created.start();
    return created.id;
  }

  async stopContainer(name: string, opts?: { ignoreMissing?: boolean }): Promise<void> {
    try {
      await this.docker.getContainer(name).stop();
    } catch (err) {
      if (opts?.ignoreMissing && isNotFound(err)) return;
      if (isAlreadyStopped(err)) return;
      throw err;
    }
  }

  async removeContainer(name: string, opts?: { ignoreMissing?: boolean }): Promise<void> {
    try {
      await this.docker.getContainer(name).remove({ force: true });
    } catch (err) {
      if (opts?.ignoreMissing && isNotFound(err)) return;
      throw err;
    }
  }

  async streamLogs(
    name: string,
    opts: { tail?: number; follow?: boolean } = {},
  ): Promise<Readable> {
    const container = this.docker.getContainer(name);
    const follow = opts.follow ?? true;
    const tail = opts.tail ?? 200;
    const stream = follow
      ? await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          tail,
          timestamps: true,
        })
      : await container.logs({
          follow: false,
          stdout: true,
          stderr: true,
          tail,
          timestamps: true,
        });
    return stream as unknown as Readable;
  }

  async ensureNetwork(name: string): Promise<void> {
    const networks = await this.docker.listNetworks({ filters: { name: [name] } });
    if (networks.some((n) => n.Name === name)) return;
    await this.docker.createNetwork({ Name: name, Driver: 'bridge' });
  }
}

function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { statusCode?: number; reason?: string };
  return e.statusCode === 404 || e.reason === 'no such container';
}

function isAlreadyStopped(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { statusCode?: number };
  return e.statusCode === 304;
}
