'use client';

import { useEffect } from 'react';
import { trackFunnel } from '@/lib/analytics/funnel-client';
import type { FunnelEventName } from '@/lib/analytics/funnel';

/**
 * De dónde llega a la landing. El navegador de TikTok casi nunca manda referrer: se usa `utm_source` del enlace
 * o se reconoce el navegador de la app (TikTok, Instagram). `?de=<autor>` se suma (qué video lo trajo).
 */
function landingSource(): string | undefined {
  try {
    const q = new URLSearchParams(window.location.search);
    const ua = navigator.userAgent;
    const src = q.get('utm_source')?.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24)
      || (/musical_ly|bytedance|tiktok/i.test(ua) ? 'tiktok' : /instagram/i.test(ua) ? 'instagram' : '');
    const de = q.get('de')?.toLowerCase().replace(/[^a-z]/g, '').slice(0, 16);
    return [src, de].filter(Boolean).join('·') || undefined;
  } catch { return undefined; }
}

/** Registra que se abrió una pantalla del embudo (landing, /login). Una vez por carga. */
export function FunnelBeacon({ event }: { event: FunnelEventName }) {
  useEffect(() => { trackFunnel(event, event === 'landing_view' ? landingSource() : undefined); }, [event]);
  return null;
}
