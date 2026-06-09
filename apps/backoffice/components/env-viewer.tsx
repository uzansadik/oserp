'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@oserp-community/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@oserp-community/ui/components/table';

const SECRET_HINTS = ['PASSWORD', 'SECRET', 'TOKEN', 'KEY', 'DATABASE_URL', 'DSN'];

function isSecretKey(key: string): boolean {
  return SECRET_HINTS.some((hint) => key.toUpperCase().includes(hint));
}

function maskValue(value: string): string {
  if (value.length === 0) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 2)}${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-2)}`;
}

export function EnvViewer({ env }: { env: Record<string, string> }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const entries = Object.entries(env).sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">Henüz env tanımlı değil.</p>;
  }

  function toggle(key: string) {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[14rem]">Anahtar</TableHead>
          <TableHead>Değer</TableHead>
          <TableHead className="w-[6rem] text-right">İşlem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([key, value]) => {
          const secret = isSecretKey(key);
          const show = !secret || revealed[key];
          return (
            <TableRow key={key}>
              <TableCell className="font-mono text-xs">{key}</TableCell>
              <TableCell className="font-mono text-xs">
                <span className="break-all">{show ? value : maskValue(value)}</span>
              </TableCell>
              <TableCell className="text-right">
                {secret ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => toggle(key)}
                  >
                    {show ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
