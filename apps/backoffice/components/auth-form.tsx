'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@oserp-community/ui/components/alert';
import { Button } from '@oserp-community/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@oserp-community/ui/components/card';
import { Input } from '@oserp-community/ui/components/input';
import { Label } from '@oserp-community/ui/components/label';

type Props = {
  mode: 'setup' | 'login';
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSetup = mode === 'setup';
  const title = isSetup ? 'Yönetici hesabını oluştur' : 'Backoffice girişi';
  const description = isSetup
    ? 'Bu ilk açılış sihirbazıdır. Oluşturulan hesap tüm yönetici yetkilerine sahip olur.'
    : 'Backoffice yönetici hesabınla devam et.';
  const submitLabel = isSetup ? 'Hesabı oluştur' : 'Giriş yap';
  const endpoint = isSetup ? '/api/setup' : '/api/login';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isSetup && password !== confirm) {
      setError('Parolalar eşleşmiyor.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Bilinmeyen hata.');
        return;
      }
      router.replace(data.redirect ?? '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ağ hatası.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Parola</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              required
              minLength={isSetup ? 12 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            {isSetup ? (
              <p className="text-muted-foreground text-xs">En az 12 karakter.</p>
            ) : null}
          </div>
          {isSetup ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Parolayı doğrula</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={submitting}
              />
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Gönderiliyor...' : submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
