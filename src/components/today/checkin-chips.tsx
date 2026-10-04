'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CHECKIN_OPTIONS, type MomentumState } from '@/lib/momentum';
import { cn } from '@/lib/utils';

/**
 * "¿Cómo llegas?" en un toque. El Director usa la respuesta para elegir la intervención.
 * Selección instantánea (alta frecuencia): sin animación más allá del press.
 */
export function CheckinChips({ current }: { current: MomentumState | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState(current);
  const [pending, start] = useTransition();

  async function choose(state: MomentumState) {
    if (state === selected) return;
    setSelected(state);
    await fetch('/api/momentum/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }) });
    start(() => router.refresh());
  }

  return (
    <div role="radiogroup" aria-label="¿Cómo llegas hoy?" aria-busy={pending} className="flex flex-wrap gap-1.5">
      {CHECKIN_OPTIONS.map((o) => {
        const on = selected === o.state;
        return (
          <button key={o.state} type="button" role="radio" aria-checked={on} onClick={() => choose(o.state)}
            className={cn('press h-9 rounded-lg px-3 text-sm', on ? 'bg-soi-ink text-white' : 'bg-white text-soi-ink shadow-ring hover:shadow-soft')}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
