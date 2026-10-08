'use client';

import { useEffect, useState } from 'react';
import { usePendingNav } from './pending-nav';

/**
 * Barra fina arriba mientras se abre una pantalla (solo si tarda más de 150 ms: lo rápido no parpadea).
 * Solo transform y opacidad; con movimiento reducido, la barra aparece quieta.
 */
export function NavProgress() {
  const pending = usePendingNav();
  const [visible, setVisible] = useState(false);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    if (!pending) { setVisible(false); setGrown(false); return; }
    const show = window.setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    }, 150);
    return () => window.clearTimeout(show);
  }, [pending]);

  if (!visible) return null;
  return (
    <div role="progressbar" aria-label="Cargando" aria-busy="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      <div
        className="h-full origin-left bg-soi-accent-fill transition-transform duration-[2500ms] ease-out-strong motion-reduce:transition-none"
        style={{ transform: `scaleX(${grown ? 0.85 : 0.08})` }}
      />
    </div>
  );
}
