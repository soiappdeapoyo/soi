'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Highlight } from '@/lib/creators/profile';

type Option = { id: string; title: string; cover: string | null };
const newId = () => Math.random().toString(36).slice(2, 10);

/** Destacados: grupos de tus Moments por tema (máx. 8), que aparecen como círculos bajo tu bio. */
export function HighlightsEditor({ initial, moments }: { initial: Highlight[]; moments: Option[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Highlight[]>(initial);
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<Highlight>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggle = (i: number, id: string) => {
    const h = items[i]!;
    set(i, { moment_ids: h.moment_ids.includes(id) ? h.moment_ids.filter((x) => x !== id) : [...h.moment_ids, id].slice(0, 20) });
  };

  async function save() {
    const clean = items.filter((h) => h.title.trim() && h.moment_ids.length);
    setBusy(true);
    const res = await fetch('/api/creators/highlights', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ highlights: clean }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(json.message ?? 'No se pudieron guardar.'); return; }
    setItems(clean);
    toast('Destacados guardados');
    router.refresh();
  }

  if (!moments.length) return <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Publica tu primer Moment y podrás agruparlos en destacados.</p>;

  return (
    <div className="flex flex-col gap-3">
      {items.map((h, i) => (
        <fieldset key={h.id} className="rounded-[14px] bg-white p-3 shadow-ring">
          <legend className="sr-only">Destacado {i + 1}</legend>
          <div className="flex items-center gap-2">
            <Input aria-label={`Título del destacado ${i + 1}`} value={h.title} maxLength={24} placeholder="Ej. Mañanas" onChange={(e) => set(i, { title: e.target.value })} className="flex-1" />
            <button type="button" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label={`Quitar destacado ${i + 1}`}
              className="press flex h-9 w-9 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {moments.map((m) => {
              const on = h.moment_ids.includes(m.id);
              return (
                <li key={m.id}>
                  <button type="button" aria-pressed={on} onClick={() => toggle(i, m.id)}
                    className={cn('press inline-flex h-8 max-w-[14rem] items-center gap-1.5 rounded-full px-3 text-sm', on ? 'bg-soi-accent-soft text-soi-accent shadow-[0_0_0_1px_var(--color-soi-accent)]' : 'bg-soi-sidebar text-soi-muted')}>
                    {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}<span className="truncate">{m.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      <div className="flex items-center gap-2">
        {items.length < 8 && (
          <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => setItems((xs) => [...xs, { id: newId(), title: '', moment_ids: [] }])}><Plus className="h-4 w-4" aria-hidden="true" /> Nuevo destacado</Button>
        )}
        <Button size="sm" className="ml-auto whitespace-nowrap" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar destacados'}</Button>
      </div>
    </div>
  );
}
