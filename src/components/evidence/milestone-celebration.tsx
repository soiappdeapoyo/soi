'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

/**
 * Hito de evidencias: un solo momento — anillo que se expande y desvanece (800 ms), sin bucles ni confeti que rebota.
 * Con movimiento reducido el anillo no se mueve; el mensaje se mantiene.
 */
export function MilestoneCelebration({ milestone }: { milestone: number }) {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 6000); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <div role="status" className="flex animate-enter items-center gap-4 rounded-3xl bg-soi-gold/15 p-5 shadow-[0_0_0_1px_rgb(212_175_55/0.4)]">
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <span aria-hidden="true" className="absolute inset-0 animate-celebrate rounded-full ring-2 ring-soi-gold" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-soi-gold text-soi-ink">
          <Star className="h-6 w-6" aria-hidden="true" />
        </span>
      </span>
      <div>
        <p className="nums text-2xl font-semibold">{milestone} evidencias</p>
        <p className="text-sm">Cada una es prueba de tu nueva identidad.</p>
      </div>
    </div>
  );
}
