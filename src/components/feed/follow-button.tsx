'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** Seguir / Siguiendo. Optimista; sin animación más allá del press (interacción frecuente). */
export function FollowButton({ userId, initial, count }: { userId: string; initial: boolean; count: number }) {
  const [on, setOn] = useState(initial);
  const [n, setN] = useState(count);
  async function toggle() {
    setOn(!on); setN((x) => x + (on ? -1 : 1));
    const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
    if (!res.ok) { setOn(on); setN((x) => x + (on ? 1 : -1)); toast('No se pudo actualizar.'); }
  }
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={toggle} aria-pressed={on}
        className={cn('press h-9 rounded-lg px-4 text-sm font-medium', on ? 'bg-white text-soi-ink shadow-ring' : 'bg-soi-ink text-white')}>
        {on ? 'Siguiendo' : 'Seguir'}
      </button>
      <span className="nums text-sm text-soi-muted">{n} {n === 1 ? 'seguidor' : 'seguidores'}</span>
    </div>
  );
}
