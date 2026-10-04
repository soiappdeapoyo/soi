'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';

export function MomentOwnerControls({ id, visibility, canShare, isCreator, blueprintId }: {
  id: string; visibility: 'private' | 'community'; canShare: boolean; isCreator: boolean; blueprintId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setVisibility(v: 'private' | 'community') {
    setBusy(true);
    const res = await fetch(`/api/moments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibility: v }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo actualizar.'); return; }
    toast(v === 'community' ? 'Compartido con la comunidad' : 'Ahora es privado');
    router.refresh();
  }

  async function remove() {
    if (!window.confirm('¿Eliminar este momento? No se puede deshacer.')) return;
    setBusy(true);
    await fetch(`/api/moments/${id}`, { method: 'DELETE' });
    router.push('/mi-vida#biblioteca');
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibility === 'private'
        ? <Button size="sm" onClick={() => setVisibility('community')} disabled={busy || !canShare}>{canShare ? 'Compartir con la comunidad' : 'Compartir (SOI+)'}</Button>
        : <Button size="sm" variant="outline" onClick={() => setVisibility('private')} disabled={busy}>Hacer privado</Button>}
      {blueprintId
        ? <Link href={`/blueprints/${blueprintId}`} className={buttonClass('outline', 'sm')}>Ver Blueprint</Link>
        : <Link href={isCreator ? `/creadores/blueprint?momento=${id}` : '/creadores'} className={buttonClass('outline', 'sm')}>Convertir en Blueprint</Link>}
      <Button size="sm" variant="ghost" onClick={remove} disabled={busy} className="text-soi-danger">Eliminar</Button>
    </div>
  );
}
