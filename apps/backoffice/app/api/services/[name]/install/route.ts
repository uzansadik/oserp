import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { DockerService } from '@/server/docker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ name: string }> };

type InstallBody = {
  image?: unknown;
  tag?: unknown;
  env?: unknown;
  ports?: unknown;
  volumes?: unknown;
  network?: unknown;
};

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const { name } = await params;
  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: 'Gecersiz servis adi.' }, { status: 400 });
  }

  let body: InstallBody;
  try {
    body = (await request.json()) as InstallBody;
  } catch {
    return NextResponse.json({ error: 'Gecersiz JSON govdesi.' }, { status: 400 });
  }

  const image = typeof body.image === 'string' ? body.image.trim() : '';
  const tag = typeof body.tag === 'string' ? body.tag.trim() : 'latest';
  if (image.length === 0) {
    return NextResponse.json({ error: 'image alani zorunlu.' }, { status: 400 });
  }

  const env = parseStringMap(body.env);
  const ports = parsePortMap(body.ports);
  const volumes = parseStringArray(body.volumes);
  const network = typeof body.network === 'string' && body.network.length > 0 ? body.network : undefined;

  const ctx = await getContext();
  const docker = new DockerService();

  await ctx.services.upsert({
    name,
    image,
    currentTag: tag,
    status: 'installing',
    lastStartedAt: null,
  });
  await ctx.services.recordEvent({
    serviceName: name,
    kind: 'install_started',
    payloadJson: JSON.stringify({ by: admin.email, image, tag }),
  });

  try {
    await docker.pullImage(image, tag);
    if (network) await docker.ensureNetwork(network);
    await docker.runContainer({
      name,
      image,
      tag,
      ...(Object.keys(env).length > 0 ? { env } : {}),
      ...(Object.keys(ports).length > 0 ? { ports } : {}),
      ...(volumes.length > 0 ? { volumes } : {}),
      ...(network ? { network } : {}),
      restart: 'unless-stopped',
    });
    const startedAt = new Date();
    await ctx.services.updateStatus(name, 'running', startedAt);
    await ctx.services.recordEvent({
      serviceName: name,
      kind: 'install_succeeded',
      payloadJson: JSON.stringify({ by: admin.email, image, tag }),
    });
    return NextResponse.json({ ok: true, name, image, tag });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.services.updateStatus(name, 'failed');
    await ctx.services.recordEvent({
      serviceName: name,
      kind: 'install_failed',
      payloadJson: JSON.stringify({ by: admin.email, image, tag, error: message }),
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function parseStringMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    }
  }
  return out;
}

function parsePortMap(value: unknown): Record<number, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(value)) {
    const containerPort = Number(k);
    const hostPort = Number(v);
    if (Number.isInteger(containerPort) && Number.isInteger(hostPort) && containerPort > 0 && hostPort > 0) {
      out[containerPort] = hostPort;
    }
  }
  return out;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}
