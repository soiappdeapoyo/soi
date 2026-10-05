'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Zona horaria automática: al abrir la app, si la del dispositivo cambió (o nunca se guardó), se guarda
 * en el perfil y se refresca la vista para que "hoy", la hora y las sugerencias sean las correctas.
 * Si la persona eligió una zona en Ajustes (timezone_auto = false), no se toca.
 */
export function TimezoneSync({ stored, auto }: { stored: string | null; auto: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!auto) return;
    let device = '';
    try { device = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return; }
    if (!device || device === stored) return;
    fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timezone: device }) })
      .then((r) => { if (r.ok) router.refresh(); })
      .catch(() => {});
  }, [auto, stored, router]);
  return null;
}
