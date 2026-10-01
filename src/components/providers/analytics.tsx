'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

let started = false;

export function AnalyticsProvider({ userId }: { userId?: string | null }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || started) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: true,
      persistence: 'localStorage+cookie',
      mask_all_text: true, // Privacidad: SOI maneja contenido emocional sensible.
    });
    started = true;
  }, []);

  useEffect(() => {
    if (started && userId) posthog.identify(userId);
  }, [userId]);

  return null;
}

/** Eventos de producto (nunca enviar contenido de mensajes). */
export function track(event: string, props?: Record<string, unknown>) {
  if (started) posthog.capture(event, props);
}
