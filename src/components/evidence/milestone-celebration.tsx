'use client';

import { useEffect, useState } from 'react';

export function MilestoneCelebration({ milestone }: { milestone: number }) {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 6000); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <div role="status" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-soi-gold to-amber-200 p-6 text-center text-soi-ink">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex justify-around text-2xl motion-safe:animate-[confetti_2.5s_ease-out_forwards]">
        {'✨⭐🎉✨⭐🎉✨'.split('').map((c, i) => <span key={i}>{c}</span>)}
      </div>
      <p className="text-4xl font-bold">{milestone}</p>
      <p className="font-semibold">¡{milestone} evidencias de tu nueva identidad!</p>
    </div>
  );
}
