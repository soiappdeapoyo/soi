'use client';

import { useSyncExternalStore } from 'react';

/** Avisos sin ver de la campanita (la comparten el header del teléfono y el sidebar). Lo inicia el layout. */
let count = 0;
const listeners = new Set<() => void>();

export function setNotificationCount(n: number) {
  const next = Math.max(0, Math.floor(n));
  if (next === count) return;
  count = next;
  for (const l of listeners) l();
}

export function useNotificationCount(): number {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => count,
    () => 0,
  );
}
