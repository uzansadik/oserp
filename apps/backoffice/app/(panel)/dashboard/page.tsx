import Link from 'next/link';
import { Activity, AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@oserp-community/ui/components/alert';
import { Badge } from '@oserp-community/ui/components/badge';
import { Button } from '@oserp-community/ui/components/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@oserp-community/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@oserp-community/ui/components/table';

import { getContext } from '@/server';
import { DockerService } from '@/server/docker';
import { ServiceActions } from '@/components/service-actions';
import { ServiceStatusBadge } from '@/components/service-status-badge';
import { listCatalog } from '@/server/catalog';

export const dynamic = 'force-dynamic';

function formatPorts(
  ports: Array<{ host: number | null; container: number; protocol: string }>,
): string {
  if (ports.length === 0) return '—';
  return ports
    .map((p) => (p.host !== null ? `${p.host}:${p.container}/${p.protocol}` : `${p.container}/${p.protocol}`))
    .join(', ');
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('tr-TR');
}

export default async function DashboardPage() {
  const ctx = await getContext();
  const rows = await ctx.services.list();
  const docker = new DockerService();
  const daemon = await docker.pingDaemon();

  const items = await Promise.all(
    rows.map(async (row) => {
      try {
        const container = await docker.getContainerStatus(row.name);
        return { row, container, error: null as string | null };
      } catch (err) {
        return { row, container: null, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );

  const catalogCount = listCatalog().length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Genel Bakış</h1>
        <p className="text-muted-foreground text-sm">
          Backoffice tarafından yönetilen servislerin durumu.
        </p>
      </header>

      {!daemon.reachable ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Docker daemon erişilemiyor</AlertTitle>
          <AlertDescription>
            {daemon.error ?? 'Bilinmeyen hata.'}{' '}
            Backoffice'in Docker socket'ine erişebildiğinden emin olun
            (DOCKER_HOST env veya bind mount).
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Toplam servis</CardDescription>
            <CardTitle className="text-3xl">{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Çalışan</CardDescription>
            <CardTitle className="text-3xl">
              {items.filter((i) => i.container?.running).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Katalog girdileri</CardDescription>
            <CardTitle className="text-3xl">{catalogCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Servisler</CardTitle>
            <CardDescription>
              {daemon.reachable
                ? `Docker ${daemon.version ?? '?'} • ${daemon.os ?? ''} ${daemon.arch ?? ''}`
                : 'Daemon kapalı.'}
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/install">Yeni servis kur</Link>
          </Button>
        </CardHeader>
        {items.length === 0 ? (
          <div className="px-6 pb-6">
            <div className="border-border bg-muted/40 text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-10 text-sm">
              <Activity className="size-5" />
              Henüz kurulu servis yok. Katalogdan bir servis kurarak başla.
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Sürüm</TableHead>
                <TableHead>Portlar</TableHead>
                <TableHead>Son başlangıç</TableHead>
                <TableHead className="text-right">Eylemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(({ row, container, error }) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <Link
                      href={`/services/${row.name}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <div className="text-muted-foreground text-xs font-mono">
                      {row.image}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ServiceStatusBadge
                      dbStatus={row.status}
                      running={container?.running ?? false}
                      exists={container?.exists ?? false}
                      error={error}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.currentTag}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {container ? formatPorts(container.ports) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(row.lastStartedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ServiceActions
                      name={row.name}
                      currentTag={row.currentTag}
                      running={container?.running ?? false}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {daemon.reachable ? (
        <Card>
          <CardHeader>
            <CardTitle>Docker</CardTitle>
            <CardDescription>
              {daemon.containers ?? '?'} container • {daemon.images ?? '?'} imaj • API{' '}
              {daemon.apiVersion ?? '?'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
