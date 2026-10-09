'use client';

import { VISITOR_COOKIE, type FunnelEventName } from './funnel';

/** Visitante anónimo de la landing: una cookie propia (30 días) que solo dice "es el mismo navegador". */
export function visitorId(): string | null {
  try {
    const found = document.cookie.split('; ').find((c) => c.startsWith(`${VISITOR_COOKIE}=`))?.split('=')[1];
    if (found) return found;
    const id = crypto.randomUUID();
    document.cookie = `${VISITOR_COOKIE}=${id}; Max-Age=${30 * 86_400}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    return id;
  } catch {
    return null;
  }
}

/** Registra un paso del embudo (landing → entrar → registro). Sin datos personales; el país lo pone el servidor. */
export function trackFunnel(event: FunnelEventName, detail?: string) {
  try {
    const body = JSON.stringify({ event, detail: detail?.slice(0, 60), vid: visitorId(), ref: document.referrer || null });
    if (!navigator.sendBeacon?.('/api/funnel', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/funnel', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  } catch { /* nunca rompe la página */ }
}
