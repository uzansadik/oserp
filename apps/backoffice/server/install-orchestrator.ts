import 'server-only';

import {
  getCatalogEntry,
  listCatalog,
  NETWORK_NAME,
  resolveInstallOrder,
  type CatalogEntry,
  type EnvSpecField,
  type PostInstallStep,
  type ResolvedDeps,
} from './catalog';
import { resolveEnvForEntry } from './catalog-env';
import { getContext, type BackofficeContext } from './index';
import { DockerService } from './docker';

export type InstallInput = {
  /** Hedef servis adi (catalog.key). */
  target: string;
  /** Sadece hedef servis icin (deps degil) opsiyonel tag overrride. */
  tag?: string;
  /** Servis bazinda kullanici tarafindan saglanan env'ler: { [serviceName]: { KEY: VALUE } } */
  envByService?: Record<string, Record<string, string>>;
  /** Iz dusumu (audit). */
  actorEmail: string;
};

export type ServiceInstallResult = {
  name: string;
  generated: string[];
  postInstall: Array<{ kind: string; exitCode: number; logsTail: string }>;
};

export type InstallReport = {
  target: string;
  order: string[];
  results: ServiceInstallResult[];
};

export class InstallOrchestrator {
  constructor(
    private readonly ctx: BackofficeContext,
    private readonly docker: DockerService,
  ) {}

  static async create(): Promise<InstallOrchestrator> {
    return new InstallOrchestrator(await getContext(), new DockerService());
  }

  async install(input: InstallInput): Promise<InstallReport> {
    const order = resolveInstallOrder(input.target);
    await this.docker.ensureNetwork(NETWORK_NAME);

    const resolvedDeps: ResolvedDeps = {};
    const results: ServiceInstallResult[] = [];

    for (const name of order) {
      const entry = getCatalogEntry(name);
      if (!entry) throw new Error(`Bilinmeyen servis: ${name}`);

      const userInput = input.envByService?.[name] ?? {};
      const existingEnv = await this.ctx.services.getEnv(name);
      const { env: baseEnv, generated } = resolveEnvForEntry(
        entry.envSpec,
        userInput,
        existingEnv,
      );

      const internalEnv = computeInternalEnv(entry, resolvedDeps);
      const env: Record<string, string> = { ...baseEnv, ...internalEnv };

      const tag = name === input.target && input.tag ? input.tag : entry.defaultTag;

      await this.ctx.services.upsert({
        name,
        image: entry.image,
        currentTag: tag,
        status: 'installing',
        lastStartedAt: null,
        envJson: JSON.stringify(env),
      });
      await this.ctx.services.recordEvent({
        serviceName: name,
        kind: 'install_started',
        payloadJson: JSON.stringify({ by: input.actorEmail, image: entry.image, tag, generated }),
      });

      try {
        await this.docker.pullImage(entry.image, tag);
        await this.docker.runContainer({
          name,
          image: entry.image,
          tag,
          env,
          ports: entry.ports,
          volumes: [...entry.volumes],
          network: NETWORK_NAME,
          restart: 'unless-stopped',
        });
        await this.ctx.services.updateStatus(name, 'running', new Date());
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.ctx.services.updateStatus(name, 'failed');
        await this.ctx.services.recordEvent({
          serviceName: name,
          kind: 'install_failed',
          payloadJson: JSON.stringify({ by: input.actorEmail, error: message }),
        });
        throw err;
      }

      const postInstallResults: ServiceInstallResult['postInstall'] = [];
      for (const step of entry.postInstall) {
        const result = await this.runPostInstall(name, step, env, input.actorEmail);
        postInstallResults.push(result);
      }

      await this.ctx.services.recordEvent({
        serviceName: name,
        kind: 'install_succeeded',
        payloadJson: JSON.stringify({ by: input.actorEmail, tag, postInstall: postInstallResults.length }),
      });

      resolvedDeps[name] = { env };
      results.push({ name, generated, postInstall: postInstallResults });
    }

    return { target: input.target, order, results };
  }

  async update(name: string, tag: string, actorEmail: string): Promise<void> {
    const entry = getCatalogEntry(name);
    const row = await this.ctx.services.findByName(name);
    if (!row) throw new Error(`Servis kayitli degil: ${name}`);

    const image = entry?.image ?? row.image;
    const env = await this.ctx.services.getEnv(name);

    await this.ctx.services.updateStatus(name, 'updating');
    await this.ctx.services.recordEvent({
      serviceName: name,
      kind: 'update_started',
      payloadJson: JSON.stringify({ by: actorEmail, fromTag: row.currentTag, toTag: tag }),
    });

    try {
      await this.docker.pullImage(image, tag);
      await this.docker.runContainer({
        name,
        image,
        tag,
        env,
        ports: entry?.ports ?? {},
        volumes: entry ? [...entry.volumes] : [],
        network: NETWORK_NAME,
        restart: 'unless-stopped',
      });
      await this.ctx.services.upsert({
        name,
        image,
        currentTag: tag,
        status: 'running',
        lastStartedAt: new Date(),
        envJson: JSON.stringify(env),
      });
      await this.ctx.services.recordEvent({
        serviceName: name,
        kind: 'update_succeeded',
        payloadJson: JSON.stringify({ by: actorEmail, tag }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.ctx.services.updateStatus(name, 'failed');
      await this.ctx.services.recordEvent({
        serviceName: name,
        kind: 'update_failed',
        payloadJson: JSON.stringify({ by: actorEmail, tag, error: message }),
      });
      throw err;
    }
  }

  private async runPostInstall(
    serviceName: string,
    step: PostInstallStep,
    serviceEnv: Record<string, string>,
    actorEmail: string,
  ): Promise<{ kind: string; exitCode: number; logsTail: string }> {
    const env = step.envFromService === serviceName ? serviceEnv : await this.ctx.services.getEnv(step.envFromService);
    await this.docker.pullImage(step.image, step.tag);
    const taskName = `${serviceName}-${step.kind}-${Date.now()}`;
    const { exitCode, logs } = await this.docker.runOnce({
      name: taskName,
      image: step.image,
      tag: step.tag,
      command: [...step.command],
      env,
      network: NETWORK_NAME,
    });
    const logsTail = tail(logs, 4000);
    await this.ctx.services.recordEvent({
      serviceName,
      kind: `post_install_${step.kind}`,
      payloadJson: JSON.stringify({ by: actorEmail, exitCode, logs: logsTail }),
    });
    if (exitCode !== 0) {
      throw new Error(`Post-install ${step.kind} basarisiz (exit ${exitCode}). Loglar: ${logsTail.slice(-500)}`);
    }
    return { kind: step.kind, exitCode, logsTail };
  }
}

function computeInternalEnv(
  entry: CatalogEntry,
  deps: ResolvedDeps,
): Record<string, string> {
  if (!entry.internalEnvFromDeps) return {};
  const out: Record<string, string> = {};
  for (const [key, fn] of Object.entries(entry.internalEnvFromDeps)) {
    out[key] = fn(deps);
  }
  return out;
}

function tail(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(text.length - max);
}

export { listCatalog, getCatalogEntry, NETWORK_NAME, type EnvSpecField, type CatalogEntry };
