'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Pencil, Play } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { formatPrice } from '@/config/creators';
import { track } from '@/components/providers/analytics';

type Props = {
  id: string;
  own: boolean;
  status: 'private' | 'draft' | 'published' | 'archived';
  canPublish: boolean;
  premium: { priceCents: number; currency: string; purchased: boolean } | null;
};

/** Comenzar · Guardar mi versión · Comprar · (dueño) Editar, publicar y archivar. */
export function MomentActions({ id, own, status, canPublish, premium }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const locked = premium && !premium.purchased && !own;

  async function fork() {
    setBusy(true);
    const res = await fetch(`/api/moments-flow/${id}/fork`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(json.message ?? 'No se pudo guardar tu versión.'); return; }
    track('moment_forked', { moment: id });
    toast('Guardaste tu versión. Ahora puedes modificarla.');
    router.push(`/m/${json.id}`);
  }

  async function buy() {
    setBusy(true);
    const res = await fetch(`/api/blueprints/${id}/checkout`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) { setBusy(false); toast(json.message ?? 'No se pudo iniciar el pago.'); return; }
    window.location.href = json.url;
  }

  async function setStatus(next: 'private' | 'published' | 'archived') {
    setBusy(true);
    const res = await fetch(`/api/moments-flow/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo actualizar.'); return; }
    toast(next === 'published' ? 'Publicado en Impulso' : next === 'archived' ? 'Archivado' : 'Ahora es privado');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {locked ? (
        <Button size="lg" onClick={buy} disabled={busy}>{busy ? 'Abriendo pago…' : `Obtener por ${formatPrice(premium!.priceCents, premium!.currency)}`}</Button>
      ) : (
        <Link href={`/m/${id}/play`} className={buttonClass('primary', 'lg')}><Play className="h-4 w-4" aria-hidden="true" /> Comenzar</Link>
      )}
      <div className="flex flex-wrap gap-2">
        {own ? (
          <>
            <Link href={`/m/nuevo?editar=${id}`} className={buttonClass('outline', 'sm')}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar</Link>
            {canPublish && status !== 'published' && <Button size="sm" variant="outline" onClick={() => setStatus('published')} disabled={busy}>Publicar</Button>}
            {status === 'published' && <Button size="sm" variant="outline" onClick={() => setStatus('private')} disabled={busy}>Hacer privado</Button>}
            {status !== 'archived' && <Button size="sm" variant="ghost" onClick={() => setStatus('archived')} disabled={busy}>Archivar</Button>}
          </>
        ) : !locked && (
          <Button size="sm" variant="outline" onClick={fork} disabled={busy}><Copy className="h-4 w-4" aria-hidden="true" /> Guardar mi versión</Button>
        )}
      </div>
    </div>
  );
}
