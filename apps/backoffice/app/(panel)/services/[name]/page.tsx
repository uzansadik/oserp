import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Badge } from '@oserp-community/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@oserp-community/ui/components/card';
import { Separator } from '@oserp-community/ui/components/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@oserp-community/ui/components/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@oserp-community/ui/components/table';

import { EnvViewer } from '@/components/env-viewer';
import { LogStream } from '@/components/log-stream';
import { ServiceActions } from '@/components/service-actions';
import { ServiceStatusBadge } from '@/components/service-status-badge';
import { getContext } from '@/server';
import { DockerService } from '@/server/docker';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ name: string }> };

function formatPortLine(p: { host: number | null; container: number; protocol: string }) {
  return p.host !== null ? `${p.host}:${p.container}/${p.protocol}` : `${p.container}/${p.protocol}`;
}

export default async function ServiceDetailPage({ params }: Props) {
  const { name } = await params;
  const ctx = await getContext();
  const row = await ctx.services.findByName(name);
  if (!row) {
    notFound();
  }
  const env = await ctx.services.getEnv(name);
  const events = await ctx.services.listEvents(name, 50);

  const docker = new DockerService();
  let container: Awaited<ReturnType<DockerService['getContainerStatus']>> | null = null;
  let containerError: string | null = null;
  try {
    container = await docker.getContainerStatus(name);
  } catch (err) {
    containerError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-muted-foreground text-sm hover:underline"
            >
              ← Genel Bakış
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{name}</h1>
          <p className="text-muted-foreground text-sm font-mono">
            {row.image}:{row.currentTag}
          </p>
        </div>
        <ServiceActions
          name={row.name}
          currentTag={row.currentTag}
          running={container?.running ?? false}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Durum</CardDescription>
            <CardTitle className="text-2xl">
              <ServiceStatusBadge
                dbStatus={row.status}
                running={container?.running ?? false}
                exists={container?.exists ?? false}
                error={containerError}
              />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sürüm</CardDescription>
            <CardTitle className="font-mono text-2xl">{row.currentTag}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Son başlangıç</CardDescription>
            <CardTitle className="text-base">
              {row.lastStartedAt ? row.lastStartedAt.toLocaleString('tr-TR') : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Container</CardTitle>
          <CardDescription>
            {containerError
              ? containerError
              : container?.exists
                ? `${container.state ?? '?'} • image ${container.image ?? '?'}`
                : 'Container mevcut değil.'}
          </CardDescription>
        </CardHeader>
        {container && container.ports.length > 0 ? (
          <CardContent>
            <ul className="text-sm font-mono">
              {container.ports.map((p, i) => (
                <li key={`${p.container}-${i}`}>{formatPortLine(p)}</li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      <Tabs defaultValue="env">
        <TabsList>
          <TabsTrigger value="env">Env ({Object.keys(env).length})</TabsTrigger>
          <TabsTrigger value="events">Olaylar ({events.length})</TabsTrigger>
          <TabsTrigger value="logs">Canlı log</TabsTrigger>
        </TabsList>

        <TabsContent value="env">
          <Card>
            <CardHeader>
              <CardTitle>Ortam değişkenleri</CardTitle>
              <CardDescription>
                Değerler varsayılan olarak maskelidir. Yalnızca yöneticiler görebilir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnvViewer env={env} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Son olaylar</CardTitle>
              <CardDescription>En fazla 50 kayıt, en yeniden eskiye.</CardDescription>
            </CardHeader>
            {events.length === 0 ? (
              <CardContent>
                <p className="text-muted-foreground text-sm">Henüz olay yok.</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zaman</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Yük</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-xs">
                        {ev.at.toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {ev.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[40rem]">
                        <pre className="text-muted-foreground bg-muted/40 max-h-32 overflow-auto rounded p-2 text-[11px] whitespace-pre-wrap break-all">
                          {ev.payloadJson}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Container logları (canlı)</CardTitle>
              <CardDescription>
                SSE üzerinden son 500 satır + canlı akış. Yenile butonuyla
                yeniden bağlanabilirsin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="mb-3" />
              <LogStream serviceName={name} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
