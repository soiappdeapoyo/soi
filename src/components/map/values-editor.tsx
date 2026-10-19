'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { buttonClass } from '@/components/ui/button';
import { MAX_VALUES, MIN_VALUES, VALUES, valueById, type ValueId } from '@/config/values';
import { cn } from '@/lib/utils';

/** Tus valores (3 a 5), editables en su lugar. Sin valores todavía, la misma lista abierta para elegirlos. */
export function ValuesEditor({ values }: { values: ValueId[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(values.length === 0);
  const [chosen, setChosen] = useState<ValueId[]>(values);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/life-map', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: chosen }) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast('No se pudo guardar. Intenta de nuevo.'); return; }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <ul className="flex flex-1 flex-wrap gap-1.5">
          {values.map((v) => <li key={v} className="rounded-full bg-soi-ink px-3 py-1.5 text-sm font-medium text-white">{valueById(v)?.label}</li>)}
        </ul>
        <button type="button" onClick={() => setEditing(true)} aria-label="Editar tus valores"
          className="press tap-target -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm text-soi-muted">Elige de {MIN_VALUES} a {MAX_VALUES}: lo que más te importa, no lo que «deberías» valorar.</p>
      <div role="group" aria-label="Tus valores" className="mt-3 flex flex-wrap gap-2">
        {VALUES.map((v) => {
          const on = chosen.includes(v.id);
          const full = !on && chosen.length >= MAX_VALUES;
          return (
            <button key={v.id} type="button" aria-pressed={on} disabled={full}
              onClick={() => setChosen(on ? chosen.filter((x) => x !== v.id) : [...chosen, v.id])}
              className={cn('press tap-target rounded-full px-3.5 py-2 text-sm font-medium', on ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:bg-soi-tray', full && 'opacity-40')}>
              {v.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} disabled={saving || chosen.length < MIN_VALUES} className={buttonClass('primary', 'sm')}>{saving ? 'Guardando…' : 'Guardar'}</button>
        {values.length > 0 && <button type="button" onClick={() => { setChosen(values); setEditing(false); }} className={buttonClass('ghost', 'sm')}>Cancelar</button>}
      </div>
    </div>
  );
}
