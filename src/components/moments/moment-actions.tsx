'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Lock, Pencil, Play, Share2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button, buttonClass } from '@/components/ui/button';
import { formatPrice } from '@/config/creators';
import { track } from '@/components/providers/analytics';

type Props = {
  id: string;
  own: boolean;
  status: 'private' | 'draft' | 'published' | 'archived';
  canPublish: boolean;
  premium: { priceCents: number; currency: string; purchased: boolean } | null;
  startLabel?: string;
};

/** Comenzar · Guardar mi versión · Comprar · (dueño) Editar, publicar y archivar. */
export function MomentActions({ id, own, status, canPublish, premium, startLabel }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState<null | 'start' | 'fork'>(null);
  const locked = premium && !premium.purchased && !own;

  async function fork() {
    if (locked) { setPaywall('fork'); return; }
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
        <Button size="lg" onClick={() => setPaywall('start')}><Play className="h-4 w-4" aria-hidden="true" /> {startLabel ?? 'Comenzar'}</Button>
      ) : (
        <Link href={`/m/${id}/play`} className={buttonClass('primary', 'lg')}><Play className="h-4 w-4" aria-hidden="true" /> {startLabel ?? 'Comenzar'}</Link>
      )}
      <div className="flex flex-wrap gap-2">
        {!locked && <Link href={`/impulso?compartir=${id}`} className={buttonClass('outline', 'sm')}><Share2 className="h-4 w-4" aria-hidden="true" /> Compartir en Impulso</Link>}
        {own ? (
          <>
            <Link href={`/m/nuevo?editar=${id}`} className={buttonClass('outline', 'sm')}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar</Link>
            {canPublish && status !== 'published' && <Button size="sm" variant="outline" onClick={() => setStatus('published')} disabled={busy}>Publicar</Button>}
            {status === 'published' && <Button size="sm" variant="outline" onClick={() => setStatus('private')} disabled={busy}>Hacer privado</Button>}
            {status !== 'archived' && <Button size="sm" variant="ghost" onClick={() => setStatus('archived')} disabled={busy}>Archivar</Button>}
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={fork} disabled={busy}><Copy className="h-4 w-4" aria-hidden="true" /> Guardar mi versión</Button>
        )}
      </div>
      {premium && (
        <Dialog open={paywall !== null} onOpenChange={(o) => !o && setPaywall(null)} title="Este Moment es de pago"
          description={paywall === 'fork' ? 'Para guardar tu versión y modificarla, primero obtenlo.' : 'Para vivirlo completo, primero obtenlo.'}>
          <p className="flex items-center gap-2 text-sm text-soi-muted"><Lock className="h-4 w-4" aria-hidden="true" /> Pago único. Es tuyo para siempre, con todas sus versiones.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPaywall(null)}>Ahora no</Button>
            <Button size="sm" onClick={buy} disabled={busy}>{busy ? 'Abriendo pago…' : `Obtener por ${formatPrice(premium.priceCents, premium.currency)}`}</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
