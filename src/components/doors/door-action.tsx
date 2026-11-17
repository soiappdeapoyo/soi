'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { track } from '@/components/providers/analytics';

export type DoorBody =
  | { action: 'choose' | 'add' | 'remove'; door: string }
  | { action: 'mode'; mode: 'full' | 'door' };

/** Un botón que cambia la puerta o el modo (app enfocada / SOI Full) y vuelve a pintar la pantalla. */
export function DoorAction({ body, className, children, ariaLabel, to }: {
  body: DoorBody; className?: string; children: React.ReactNode; ariaLabel?: string; to?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/door', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      track('door_changed', body);
      start(() => { if (to) router.push(to); router.refresh(); });
    } catch {
      toast.error('No pudimos guardarlo. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={run} disabled={busy || pending} aria-label={ariaLabel} aria-busy={busy || pending} className={className}>
      {children}
    </button>
  );
}
