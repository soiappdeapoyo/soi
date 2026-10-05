'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { MomentFlowCard } from './moment-flow-card';
import type { MomentFlow } from '@/lib/moments/types';
import { cn } from '@/lib/utils';

type Item = { moment: MomentFlow; deletable: boolean; stale: boolean };

/**
 * Mosaico de Mis Moments. "Seleccionar" permite eliminar uno o varios (se archivan: el historial se conserva)
 * y "Deshacer" los devuelve. "Seleccionar los que no usas" marca los que llevan 3+ semanas sin vivirse.
 */
export function MyMomentsGrid({ items, startSelecting = false }: { items: Item[]; startSelecting?: boolean }) {
  const router = useRouter();
  const deletable = items.filter((i) => i.deletable);
  const [selecting, setSelecting] = useState(startSelecting && deletable.length > 0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(startSelecting ? items.filter((i) => i.deletable && i.stale).map((i) => i.moment.id) : []));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const staleIds = items.filter((i) => i.deletable && i.stale).map((i) => i.moment.id);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function remove() {
    setBusy(true);
    const res = await fetch('/api/moments-flow/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archive', items: [...selected].map((id) => ({ id })) }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false); setConfirm(false);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudieron eliminar.'); return; }
    const archived = json.archived as { id: string; status: string }[];
    setSelected(new Set()); setSelecting(false);
    router.refresh();
    toast(archived.length === 1 ? 'Moment eliminado' : `${archived.length} Moments eliminados`, {
      description: 'Menos es más: ahora es más fácil elegir.',
      action: {
        label: 'Deshacer',
        onClick: async () => {
          await fetch('/api/moments-flow/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore', items: archived }) });
          router.refresh();
        },
      },
    });
  }

  return (
    <>
      {deletable.length > 0 && (
        <div className="-mt-1 mb-3 flex flex-wrap items-center justify-end gap-2">
          {selecting && staleIds.length > 0 && (
            <button type="button" onClick={() => setSelected(new Set(staleIds))} className="press h-8 rounded-full px-3 text-sm text-soi-accent hover:bg-black/[0.04]">
              Seleccionar los que no usas ({staleIds.length})
            </button>
          )}
          <button type="button" onClick={() => { setSelecting((v) => !v); setSelected(new Set()); }} aria-pressed={selecting}
            className="press h-8 rounded-full px-3 text-sm font-medium text-soi-ink shadow-ring">
            {selecting ? 'Listo' : 'Seleccionar'}
          </button>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        {items.map(({ moment: m, deletable: canDelete, stale }) => {
          const on = selected.has(m.id);
          return (
            <li key={m.id} className="relative">
              {selecting ? (
                <button type="button" onClick={() => canDelete && toggle(m.id)} disabled={!canDelete} aria-pressed={on}
                  aria-label={canDelete ? `${on ? 'Quitar de la selección' : 'Seleccionar'}: ${m.title}` : `${m.title} (comprado u oficial: no se puede eliminar)`}
                  className={cn('press block w-full text-left', !canDelete && 'opacity-40')}>
                  <div className={cn('rounded-[16px] transition-transform duration-150 ease-out-strong', on && 'scale-[0.96] shadow-[0_0_0_2.5px_var(--color-soi-accent)]')}>
                    <div className="pointer-events-none"><MomentFlowCard m={m} variant="tile" /></div>
                  </div>
                  {canDelete && (
                    <span aria-hidden="true" className={cn('absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full shadow-ring', on ? 'bg-soi-accent-fill text-white' : 'bg-white/90')}>
                      {on && <Check className="h-4 w-4" />}
                    </span>
                  )}
                  {stale && canDelete && <span className="text-xs text-soi-subtle">Sin vivir hace 3+ semanas</span>}
                </button>
              ) : (
                <MomentFlowCard m={m} variant="tile" />
              )}
            </li>
          );
        })}
      </ul>

      {selecting && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-white/95 p-2 pl-4 shadow-raised backdrop-blur md:bottom-4">
          <span className="nums text-sm text-soi-muted">{selected.size ? `${selected.size} seleccionados` : 'Toca para seleccionar'}</span>
          <Button size="sm" variant="danger" onClick={() => setConfirm(true)} disabled={!selected.size}><Trash2 className="h-4 w-4" aria-hidden="true" /> Eliminar</Button>
        </div>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm} title={selected.size === 1 ? '¿Eliminar este Moment?' : `¿Eliminar ${selected.size} Moments?`}
        description="Desaparecen de Mi Vida. Tu historial de ejecuciones se conserva y puedes deshacerlo.">
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancelar</Button>
          <Button size="sm" variant="danger" onClick={remove} disabled={busy}>{busy ? 'Eliminando…' : 'Eliminar'}</Button>
        </div>
      </Dialog>
    </>
  );
}
