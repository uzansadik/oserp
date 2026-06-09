'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@oserp-community/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@oserp-community/ui/components/dialog';
import { Input } from '@oserp-community/ui/components/input';
import { Label } from '@oserp-community/ui/components/label';

type Props = {
  name: string;
  currentTag: string;
  running: boolean;
};

export function ServiceActions({ name, currentTag, running }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateTag, setUpdateTag] = useState(currentTag);
  const [updateOpen, setUpdateOpen] = useState(false);

  async function callJson(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data;
  }

  async function onStop() {
    setError(null);
    setPending('stop');
    try {
      await callJson(`/api/services/${name}/stop`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending('update');
    try {
      await callJson(`/api/services/${name}/update`, { tag: updateTag });
      setUpdateOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? (
        <span className="text-destructive max-w-[16rem] truncate text-xs" title={error}>
          {error}
        </span>
      ) : null}
      <Button size="sm" variant="ghost" asChild>
        <Link href={`/services/${name}`}>Detay</Link>
      </Button>
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={pending !== null}>
            Güncelle
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={onUpdate} className="contents">
            <DialogHeader>
              <DialogTitle>{name} servisini güncelle</DialogTitle>
              <DialogDescription>
                Yeni tag girip onayla. Mevcut tag: <span className="font-mono">{currentTag}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`tag-${name}`}>Yeni tag</Label>
              <Input
                id={`tag-${name}`}
                value={updateTag}
                onChange={(e) => setUpdateTag(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Vazgeç
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending === 'update'}>
                {pending === 'update' ? 'Güncelleniyor...' : 'Güncelle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Button
        size="sm"
        variant="outline"
        onClick={onStop}
        disabled={pending !== null || !running}
      >
        {pending === 'stop' ? 'Durduruluyor...' : 'Durdur'}
      </Button>
    </div>
  );
}
