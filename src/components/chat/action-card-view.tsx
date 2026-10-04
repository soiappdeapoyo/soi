'use client';

import { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActionCardResult = { id: string | null; title: string; minutes: number; detail: string | null; category: string | null; done: boolean };

/**
 * Action Card generada por el Momentum Director: insight → acción concreta.
 * Marcarla como hecha alimenta el Momentum Score. Feedback inmediato, sin celebración (alta frecuencia).
 */
export function ActionCardView({ card }: { card: ActionCardResult }) {
  const [done, setDone] = useState(card.done);
  const [busy, setBusy] = useState(false);

  async function complete() {
    if (!card.id || done) return;
    setBusy(true);
    setDone(true);
    const res = await fetch(`/api/actions/${card.id}/complete`, { method: 'POST' });
    if (!res.ok) setDone(false);
    setBusy(false);
  }

  return (
    <div className="mt-3 flex max-w-sm items-center gap-3 rounded-[14px] bg-white p-1.5 pl-3 shadow-ring">
      <span className="min-w-0 flex-1 py-1.5">
        <span className={cn('block text-sm font-medium', done && 'text-soi-muted line-through decoration-soi-subtle')}>{card.title}</span>
        <span className="nums flex items-center gap-1 text-xs text-soi-muted">
          <Clock className="h-3 w-3" aria-hidden="true" />{card.minutes} min{card.category ? ` · ${card.category}` : ''}
        </span>
      </span>
      <button type="button" onClick={complete} disabled={!card.id || done || busy} aria-pressed={done}
        className={cn('press flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm',
          done ? 'bg-soi-accent-soft text-soi-accent' : 'bg-soi-ink text-white disabled:opacity-40')}>
        <Check className="h-4 w-4" aria-hidden="true" /> {done ? 'Hecho' : 'Marcar hecho'}
      </button>
    </div>
  );
}
