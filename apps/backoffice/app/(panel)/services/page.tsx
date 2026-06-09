import Link from 'next/link';

import { Badge } from '@oserp-community/ui/components/badge';
import { Button } from '@oserp-community/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@oserp-community/ui/components/card';

import { getContext } from '@/server';

export const dynamic = 'force-dynamic';

export default async function ServicesIndexPage() {
  const ctx = await getContext();
  const rows = await ctx.services.list();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Servisler</h1>
          <p className="text-muted-foreground text-sm">
            Kayıtlı tüm servisler. Detay için bir kart seç.
          </p>
        </div>
        <Button asChild>
          <Link href="/install">Yeni servis kur</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Henüz servis yok</CardTitle>
            <CardDescription>
              Katalogdan bir servis kurarak başla.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <Link key={row.name} href={`/services/${row.name}`}>
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{row.name}</span>
                    <Badge variant="outline">{row.status}</Badge>
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {row.image}:{row.currentTag}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  Son başlangıç:{' '}
                  {row.lastStartedAt ? row.lastStartedAt.toLocaleString('tr-TR') : '—'}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
