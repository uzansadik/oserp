'use client';

import { Pause, Play, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@oserp-community/ui/components/button';

type Props = { serviceName: string };

const MAX_LINES = 1000;

export function LogStream({ serviceName }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  function disconnect() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  function connect() {
    disconnect();
    setLines([]);
    setError(null);
    setStatus('connecting');
    const es = new EventSource(`/api/services/${serviceName}/logs?tail=500&follow=1`);
    esRef.current = es;
    es.onopen = () => setStatus('open');
    es.onmessage = (ev) => {
      if (pausedRef.current) return;
      setLines((prev) => {
        const next = [...prev, ev.data];
        if (next.length > MAX_LINES) {
          return next.slice(next.length - MAX_LINES);
        }
        return next;
      });
    };
    es.addEventListener('end', () => {
      setStatus('closed');
      es.close();
    });
    es.addEventListener('error', (ev) => {
      const message = (ev as MessageEvent).data;
      try {
        const parsed = typeof message === 'string' ? JSON.parse(message) : null;
        if (parsed && typeof parsed.message === 'string') {
          setError(parsed.message);
        }
      } catch {
        // ignore
      }
    });
    es.onerror = () => {
      setStatus('error');
    };
  }

  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceName]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || paused) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, paused]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-muted-foreground text-xs">
          Durum: <span className="font-mono">{status}</span> • {lines.length} satır
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <>
                <Play className="size-3" /> Devam
              </>
            ) : (
              <>
                <Pause className="size-3" /> Duraklat
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" type="button" onClick={connect}>
            <RotateCw className="size-3" /> Yenile
          </Button>
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : null}
      <div
        ref={scrollerRef}
        className="bg-card border-border h-96 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-muted-foreground">Henüz log yok…</p>
        ) : (
          lines.map((line, i) => (
            <div key={`${i}-${line.slice(0, 12)}`} className="break-all whitespace-pre-wrap">
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
