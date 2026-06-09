import { type NextRequest, NextResponse } from 'next/server';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { DockerService } from '@/server/docker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ name: string }> };

const DEFAULT_TAIL = 200;
const MAX_TAIL = 2000;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const { name } = await params;
  const ctx = await getContext();
  const row = await ctx.services.findByName(name);
  if (!row) {
    return NextResponse.json({ error: 'Servis bulunamadi.' }, { status: 404 });
  }

  const tailParam = request.nextUrl.searchParams.get('tail');
  const tail = tailParam ? Math.min(MAX_TAIL, Math.max(1, Number(tailParam))) : DEFAULT_TAIL;
  const followParam = request.nextUrl.searchParams.get('follow');
  const follow = followParam === '1' || followParam === 'true';

  const docker = new DockerService();
  let nodeStream;
  try {
    nodeStream = await docker.streamLogs(row.name, { tail, follow });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const sseStream = new ReadableStream<Uint8Array>({
    start(controller) {
      const onData = (chunk: Buffer) => {
        const text = stripDockerHeader(chunk).toString('utf8');
        for (const line of text.split('\n')) {
          if (line.length === 0) continue;
          controller.enqueue(encoder.encode(`data: ${line}\n\n`));
        }
      };
      const onEnd = () => {
        controller.enqueue(encoder.encode('event: end\ndata: {}\n\n'));
        controller.close();
      };
      const onError = (err: Error) => {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`),
        );
        controller.close();
      };
      nodeStream.on('data', onData);
      nodeStream.once('end', onEnd);
      nodeStream.once('close', onEnd);
      nodeStream.once('error', onError);
      request.signal.addEventListener('abort', () => {
        nodeStream.destroy();
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function stripDockerHeader(chunk: Buffer): Buffer {
  const parts: Buffer[] = [];
  let offset = 0;
  while (offset + 8 <= chunk.length) {
    const size = chunk.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > chunk.length) break;
    parts.push(chunk.subarray(start, end));
    offset = end;
  }
  if (parts.length === 0) return chunk;
  return Buffer.concat(parts);
}
