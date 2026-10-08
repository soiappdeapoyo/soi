'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { normalizePath, SESSION_IDLE_MS, type NavKind } from '@/lib/analytics/nav';

type Pending = { kind: NavKind; path: string; at: string; sid: string };

const SID_KEY = 'soi-nav-sid';

/** Sesión de navegación: se renueva tras 30 min sin actividad. Sin storage (modo privado), una por carga. */
function sessionId(): string {
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(SID_KEY);
    const saved = raw ? (JSON.parse(raw) as { id: string; last: number }) : null;
    const id = saved && now - saved.last < SESSION_IDLE_MS ? saved.id : crypto.randomUUID();
    sessionStorage.setItem(SID_KEY, JSON.stringify({ id, last: now }));
    return id;
  } catch {
    return (window as unknown as { __soiSid?: string }).__soiSid ??= crypto.randomUUID();
  }
}

/**
 * Registra qué pantallas se abren y en qué orden (para encontrar fricciones en /panel/analytics).
 * Solo la ruta normalizada (sin ids ni contenido). Se envía en lotes con sendBeacon.
 */
export function NavTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const queue = useRef<Pending[]>([]);
  const last = useRef<string | null>(null);

  useEffect(() => {
    const flush = () => {
      if (!queue.current.length) return;
      const body = JSON.stringify({ events: queue.current.splice(0, 50) });
      if (!navigator.sendBeacon?.('/api/nav', new Blob([body], { type: 'application/json' }))) {
        void fetch('/api/nav', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden' && last.current) {
        queue.current.push({ kind: 'leave', path: last.current, at: new Date().toISOString(), sid: sessionId() });
        flush();
      } else if (document.visibilityState === 'visible' && last.current) {
        // Vuelve a la app: la pantalla en la que estaba cuenta como vista de nuevo (puede ser otra sesión).
        queue.current.push({ kind: 'view', path: last.current, at: new Date().toISOString(), sid: sessionId() });
      }
    };
    const timer = window.setInterval(flush, 15_000);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  useEffect(() => {
    const path = normalizePath(pathname, search.toString());
    if (path === last.current) return;
    last.current = path;
    queue.current.push({ kind: 'view', path, at: new Date().toISOString(), sid: sessionId() });
    if (queue.current.length >= 10) {
      const body = JSON.stringify({ events: queue.current.splice(0, 50) });
      void fetch('/api/nav', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  }, [pathname, search]);

  return null;
}
