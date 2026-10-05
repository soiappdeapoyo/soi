'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS = [{ v: 'want', l: 'Quiero leer' }, { v: 'reading', l: 'Leyendo' }, { v: 'done', l: 'Leído' }] as const;

/** Estado de lectura (libros) y quitar de la biblioteca. */
export function LibraryItemActions({ id, kind, status, back }: { id: string; kind: 'book' | 'pdf' | 'exercise' | 'meditation' | 'affirmations' | 'manifestation'; status: string; back: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);

  async function setStatus(v: string) {
    setCurrent(v);
    const res = await fetch(`/api/library/items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: v }) });
    if (!res.ok) { toast('No se pudo actualizar.'); setCurrent(status); return; }
    router.refresh();
  }
  async function remove() {
    if (!window.confirm(kind === 'pdf' ? '¿Quitar este PDF? Se borrará el archivo.' : '¿Quitar de tu biblioteca?')) return;
    setBusy(true);
    const res = await fetch(`/api/library/items/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) { toast('No se pudo quitar.'); return; }
    toast('Quitado de tu biblioteca');
    router.push(back);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {kind === 'book' && (
        <div role="radiogroup" aria-label="Estado de lectura" className="grid grid-cols-3 gap-1 rounded-[14px] bg-soi-sidebar p-1">
          {STATUS.map((s) => (
            <button key={s.v} type="button" role="radio" aria-checked={current === s.v} onClick={() => setStatus(s.v)}
              className={cn('press h-8 rounded-lg px-2.5 text-xs', current === s.v ? 'bg-white font-medium shadow-ring' : 'text-soi-muted')}>{s.l}</button>
          ))}
        </div>
      )}
      <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>Quitar</Button>
    </div>
  );
}
