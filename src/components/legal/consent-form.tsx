'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConsentCheck } from '@/components/legal/consent-check';
import type { ConsentKind } from '@/lib/consent-text';

/** Términos o aviso actualizados: la misma casilla del login y un botón. */
export function ConsentForm({ next, kind }: { next: string; kind: ConsentKind }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const check = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) { setMissing(true); check.current?.focus(); return; }
    setBusy(true);
    const res = await fetch('/api/legal/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept: true }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); toast(json.message ?? 'No pudimos guardar tu aceptación. Intenta de nuevo.'); return; }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
      <ConsentCheck ref={check} kind={kind} checked={accepted} missing={missing}
        onChange={(v) => { setAccepted(v); if (v) setMissing(false); }} />
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Guardando…' : 'Continuar'}
      </Button>
    </form>
  );
}
