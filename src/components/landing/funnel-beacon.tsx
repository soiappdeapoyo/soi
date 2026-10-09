'use client';

import { useEffect } from 'react';
import { trackFunnel } from '@/lib/analytics/funnel-client';
import type { FunnelEventName } from '@/lib/analytics/funnel';

/** Registra que se abrió una pantalla del embudo (landing, /login). Una vez por carga. */
export function FunnelBeacon({ event }: { event: FunnelEventName }) {
  useEffect(() => { trackFunnel(event); }, [event]);
  return null;
}
