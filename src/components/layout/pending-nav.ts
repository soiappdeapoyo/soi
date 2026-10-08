'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Navegación optimista: al tocar una pestaña se marca activa al instante, sin esperar a que el servidor
 * responda (usePathname solo cambia cuando la navegación termina). La barra inferior y el sidebar comparten
 * el mismo estado; se limpia cuando la ruta cambia de verdad.
 */
let pending: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let safety: number | undefined;

export function setPendingNav(href: string | null) {
  // Tocar la pantalla en la que ya estás no navega: no hay nada pendiente (si no, la barra quedaría fija).
  if (href && typeof window !== 'undefined' && href === window.location.pathname + window.location.search) href = null;
  if (pending === href) return;
  pending = href;
  if (typeof window !== 'undefined') {
    window.clearTimeout(safety);
    // Por si la navegación falla o redirige a la misma ruta: nunca se queda pendiente para siempre.
    if (href) safety = window.setTimeout(() => setPendingNav(null), 10_000);
  }
  emit();
}

/** La ruta (sin parámetros) y los parámetros de lo que se está abriendo. */
export function splitHref(href: string): { path: string; params: URLSearchParams } {
  const [path, query] = href.split('?');
  return { path: path ?? href, params: new URLSearchParams(query ?? '') };
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** href que se está abriendo (o null). Se reinicia al llegar a la nueva ruta. */
export function usePendingNav(): string | null {
  const pathname = usePathname();
  const search = useSearchParams();
  const value = useSyncExternalStore(subscribe, () => pending, () => null);
  useEffect(() => { setPendingNav(null); }, [pathname, search]);
  return value;
}

/** ¿Es un clic normal (no abrir en otra pestaña)? Solo entonces se marca como pendiente. */
export function isPlainClick(e: React.MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
