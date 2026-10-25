'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConsentLegend } from '@/components/legal/consent-legend';

/** Términos o aviso actualizados: la misma leyenda del login y un solo botón (sin casillas). */
export function ConsentForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Guardando…' : 'Continuar'}
      </Button>
      <ConsentLegend action="Al tocar «Continuar»" />
    </form>
  );
}
