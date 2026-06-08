'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@oserp-community/ui/components/button';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { redirect?: string };
      router.replace(data.redirect ?? '/login');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending ? 'Çıkış yapılıyor...' : 'Çıkış yap'}
    </Button>
  );
}
