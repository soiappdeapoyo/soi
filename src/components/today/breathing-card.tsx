'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const CYCLE_MS = 10_000; // 4 s inhalar · 6 s exhalar (mismo ritmo que el halo del ritual)

/**
 * Respiración guiada de un minuto (REGULATE). Reutiliza el halo de respiración del ritual:
 * es la animación expresiva de SOI y aquí cumple una función, no decora.
 * Con movimiento reducido, el halo queda estático y las instrucciones siguen cambiando.
 */
export function BreathingCard() {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(60);
  const [inhale, setInhale] = useState(true);

  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const t = setInterval(() => {
      const elapsed = Date.now() - started;
      setLeft(Math.max(0, 60 - Math.floor(elapsed / 1000)));
      setInhale(elapsed % CYCLE_MS < 4000);
      if (elapsed >= 60_000) { setRunning(false); clearInterval(t); }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const done = !running && left === 0;
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="relative flex h-36 w-36 items-center justify-center">
        <span data-breath-halo aria-hidden="true"
          className={running ? 'absolute inset-2 animate-breathe rounded-full bg-soi-accent-soft' : 'absolute inset-2 rounded-full bg-soi-accent-soft opacity-60'} />
        <span className="nums relative text-2xl font-medium" aria-live="polite">
          {running ? (inhale ? 'Inhala' : 'Exhala') : done ? 'Listo' : '1:00'}
        </span>
      </div>
      {running && <p className="nums text-sm text-soi-muted">{left} s</p>}
      {!running && (
        <Button onClick={() => { setLeft(60); setRunning(true); }} variant={done ? 'outline' : 'primary'}>
          {done ? 'Otra vez' : 'Respirar un minuto'}
        </Button>
      )}
    </div>
  );
}
