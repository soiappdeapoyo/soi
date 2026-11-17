'use client';

import { useSyncExternalStore } from 'react';

/**
 * Mensajes de SOI sin leer (la burbuja de la pestaña SOI, como en una app de mensajes). Lo inicia el layout con la
 * cuenta del servidor; sube cuando llega un mensaje con la app abierta y se actualiza al abrir la conversación o al
 * volver a la app.
 */
let count = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function setUnread(n: number) {
  const next = Math.max(0, Math.floor(n));
  if (next === count) return;
  count = next;
  emit();
}
export function bumpUnread() { setUnread(count + 1); }

export async function refreshUnread() {
  try {
    const res = await fetch('/api/coach/unread', { cache: 'no-store' });
    if (res.ok) setUnread(((await res.json()) as { unread?: number }).unread ?? 0);
  } catch { /* sin conexión: se queda como está */ }
}

export function useUnread(): number {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => count,
    () => 0,
  );
}
