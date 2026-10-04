'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function BlueprintOwnerControls({ id, status }: { id: string; status: 'draft' | 'published' | 'archived' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function set(next: 'draft' | 'published' | 'archived') {
    setBusy(true);
    const res = await fetch(`/api/blueprints/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo actualizar.'); return; }
    toast(next === 'published' ? 'Blueprint publicado' : next === 'archived' ? 'Blueprint archivado' : 'Vuelve a ser borrador');
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'published' && <Button size="sm" onClick={() => set('published')} disabled={busy}>Publicar</Button>}
      {status === 'published' && <Button size="sm" variant="outline" onClick={() => set('draft')} disabled={busy}>Despublicar</Button>}
      {status !== 'archived' && <Button size="sm" variant="ghost" onClick={() => set('archived')} disabled={busy}>Archivar</Button>}
    </div>
  );
}
