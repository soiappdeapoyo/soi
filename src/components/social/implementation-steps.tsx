'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/input';
import type { ActionCard } from '@/types/database';
import { cn } from '@/lib/utils';

/**
 * Checklist de la versión adaptada. Marcar es de alta frecuencia: feedback inmediato (press + check),
 * sin animaciones largas. Completar todo pide UNA evidencia del resultado.
 */
export function ImplementationSteps({ id, steps, initialDone, initialCompleted, initialNote }: {
  id: string; steps: ActionCard[]; initialDone: number[]; initialCompleted: boolean; initialNote: string | null;
}) {
  const [done, setDone] = useState(new Set(initialDone));
  const [completed, setCompleted] = useState(initialCompleted);
  const [note, setNote] = useState(initialNote ?? '');
  const [savedNote, setSavedNote] = useState(Boolean(initialNote));

  async function toggle(i: number) {
    const prev = new Set(done);
    setDone((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
    const res = await fetch(`/api/implementations/${id}/step`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: i }),
    });
    if (!res.ok) { setDone(prev); toast('No se pudo guardar. Intenta de nuevo.'); return; }
    const r = (await res.json()) as { completed_steps: number[]; completed: boolean };
    setDone(new Set(r.completed_steps));
    if (r.completed && !completed) toast('Completaste tu versión. Eso es evidencia de transformación.');
    setCompleted(r.completed);
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/implementations/${id}/step`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resultNote: note }),
    });
    if (!res.ok) { toast('No se pudo guardar el resultado.'); return; }
    setSavedNote(true);
    toast('Resultado guardado');
  }

  const pct = Math.round((done.size / Math.max(steps.length, 1)) * 100);
  return (
    <div className="flex flex-col gap-4">
      <div className="h-1.5 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso">
        <div className="h-full origin-left rounded-full bg-soi-accent transition-transform duration-(--dur-base) ease-out-strong" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => {
          const on = done.has(i);
          return (
            <li key={i}>
              <button type="button" onClick={() => toggle(i)} aria-pressed={on}
                className="press flex w-full items-start gap-3 rounded-[14px] bg-white p-3 text-left shadow-ring hover:shadow-soft">
                <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors duration-(--dur-fast) ease-out-strong',
                  on ? 'bg-soi-accent text-white' : 'shadow-[inset_0_0_0_1.5px_rgb(11_11_11/0.25)]')}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[15px]', on && 'text-soi-muted line-through decoration-soi-subtle')}>{s.title}</span>
                  {s.detail && <span className="mt-0.5 block text-sm text-soi-muted">{s.detail}</span>}
                </span>
                <span className="nums shrink-0 text-xs text-soi-muted">{s.minutes} min</span>
              </button>
            </li>
          );
        })}
      </ol>

      {completed && (
        <form onSubmit={saveNote} className="animate-enter rounded-[20px] bg-soi-sidebar p-3">
          <div className="rounded-lg bg-white p-4 shadow-ring">
            <Label htmlFor="impl-note">¿Qué cambió en tu vida con este sistema?</Label>
            <Textarea id="impl-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={note.trim().length < 3}>{savedNote ? 'Actualizar resultado' : 'Guardar resultado'}</Button>
              <Link href="/evidencias/nueva" className={buttonClass('outline', 'sm')}>Llevarlo a mi Muro</Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
