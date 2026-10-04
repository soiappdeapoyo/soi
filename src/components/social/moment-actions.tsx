'use client';

import { useState } from 'react';
import { HandHeart, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Resonancia ("Esto me ayudó") y Guardar para implementar. Optimista; "pop" solo al confirmar. */
export function MomentActions({ id, resonance, saves, initial }: { id: string; resonance: number; saves: number; initial: { resonance: boolean; save: boolean } }) {
  const [state, setState] = useState(initial);
  const [counts, setCounts] = useState({ resonance, saves });
  const [popped, setPopped] = useState<string | null>(null);

  async function toggle(kind: 'resonance' | 'save') {
    const was = state[kind];
    setState((s) => ({ ...s, [kind]: !was }));
    const key = kind === 'resonance' ? 'resonance' : 'saves';
    setCounts((c) => ({ ...c, [key]: Math.max(0, c[key] + (was ? -1 : 1)) }));
    const res = await fetch(`/api/moments/${id}/interact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) });
    if (!res.ok) {
      setState((s) => ({ ...s, [kind]: was }));
      setCounts((c) => ({ ...c, [key]: Math.max(0, c[key] + (was ? 1 : -1)) }));
      return;
    }
    const r = (await res.json()) as { resonance: number; saves: number };
    setCounts({ resonance: r.resonance, saves: r.saves });
    if (!was) setPopped(kind);
  }

  const btn = 'press-deep tap-target inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm';
  return (
    <div className="mt-3 flex gap-2">
      <button type="button" onClick={() => toggle('resonance')} aria-pressed={state.resonance} onAnimationEnd={() => setPopped(null)}
        className={cn(btn, state.resonance ? 'bg-soi-accent-soft text-soi-accent' : 'bg-white shadow-ring hover:bg-soi-tray', popped === 'resonance' && 'animate-pop')}>
        <HandHeart className="h-4 w-4" aria-hidden="true" /> Esto me ayudó <span className="nums sr-only">({counts.resonance})</span>
      </button>
      <button type="button" onClick={() => toggle('save')} aria-pressed={state.save} onAnimationEnd={() => setPopped(null)}
        className={cn(btn, state.save ? 'bg-soi-accent-soft text-soi-accent' : 'bg-white shadow-ring hover:bg-soi-tray', popped === 'save' && 'animate-pop')}>
        <Bookmark className={cn('h-4 w-4', state.save && 'fill-current')} aria-hidden="true" /> {state.save ? 'Guardado' : 'Guardar'}
      </button>
    </div>
  );
}
