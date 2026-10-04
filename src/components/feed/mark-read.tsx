'use client';

import { useEffect } from 'react';

/** Marca la actividad como leída después de mostrarla (el punto de "sin leer" se ve en esta visita). */
export function MarkRead() {
  useEffect(() => {
    const t = setTimeout(() => { fetch('/api/notifications/read', { method: 'POST' }).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
