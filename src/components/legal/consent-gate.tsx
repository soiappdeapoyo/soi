'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConsentCheck } from '@/components/legal/consent-check';
import type { ConsentKind } from '@/lib/consent-text';

/**
 * El consentimiento legal dentro de la app, una sola vez: un cuadro pequeño abajo con la casilla y «Aceptar». No se
 * cierra sin aceptar (el consentimiento de datos sensibles va antes de usar la app); al aceptar desaparece y queda
 * la constancia (`/api/legal/accept`). Vuelve solo si se publican términos o aviso nuevos.
 */
export function ConsentGate({ kind, updated }: { kind: ConsentKind; updated: boolean }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const check = useRef<HTMLInputElement>(null);

  useEffect(() => { check.current?.focus({ preventScroll: true }); }, []);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) { setMissing(true); check.current?.focus(); return; }
    setBusy(true);
    const res = await fetch('/api/legal/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept: true }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setBusy(false); toast(json.message ?? 'No pudimos guardar tu aceptación. Intenta de nuevo.'); return; }
    setDone(true);
    router.refresh(); // el layout ya no lo pide y aparece lo que esperaba (la bienvenida)
  }

  if (done) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:items-center md:pb-0">
      <form onSubmit={accept} role="dialog" aria-modal="true" aria-labelledby="consent-gate-title"
        className="popover-motion w-full max-w-md rounded-[20px] bg-white p-4 shadow-raised">
        <p id="consent-gate-title" className="px-2 pt-1 text-[15px] font-semibold">
          {updated ? 'Actualizamos los términos y el aviso de privacidad' : 'Antes de empezar'}
        </p>
        <div className="mt-2">
          <ConsentCheck ref={check} kind={kind} checked={accepted} missing={missing}
            onChange={(v) => { setAccepted(v); if (v) setMissing(false); }} />
        </div>
        <Button type="submit" size="lg" className="mt-3 w-full" disabled={busy}>
          {busy ? 'Guardando…' : 'Aceptar'}
        </Button>
      </form>
    </div>
  );
}
