'use client';

import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ActionCard } from '@/types/database';

/** Editor de Action Cards (título + minutos). Compartido por Moments y Blueprints. */
export function ActionListEditor({ value, onChange, max = 5, idPrefix }: { value: ActionCard[]; onChange: (v: ActionCard[]) => void; max?: number; idPrefix: string }) {
  const set = (i: number, patch: Partial<ActionCard>) => onChange(value.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <div className="flex flex-col gap-2">
      {value.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-t-${i}`} className="sr-only">Acción {i + 1}</label>
          <Input id={`${idPrefix}-t-${i}`} value={a.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Ej. Revisar gastos de la semana" maxLength={120} className="flex-1" />
          <label htmlFor={`${idPrefix}-m-${i}`} className="sr-only">Minutos de la acción {i + 1}</label>
          <Input id={`${idPrefix}-m-${i}`} type="number" inputMode="numeric" min={1} max={240} value={a.minutes}
            onChange={(e) => set(i, { minutes: Math.max(1, Math.min(240, Number(e.target.value) || 1)) })} className="nums w-20" />
          <span className="text-xs text-soi-muted" aria-hidden="true">min</span>
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Quitar acción ${i + 1}`}
            className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" onClick={() => onChange([...value, { title: '', minutes: 10 }])}
          className="press inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-2 text-sm text-soi-accent hover:bg-soi-accent-soft">
          <Plus className="h-4 w-4" aria-hidden="true" /> Agregar acción
        </button>
      )}
    </div>
  );
}
