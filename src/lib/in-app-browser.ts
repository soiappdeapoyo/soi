/**
 * Navegadores dentro de otras apps (TikTok, Instagram, Facebook…). Google no deja iniciar sesión desde ahí
 * (error 403 «disallowed_useragent»): por eso, antes del botón de Google, se pide abrir SOI en el navegador.
 * Puro y testeado.
 */
export type InAppName = 'tiktok' | 'instagram' | 'facebook' | 'otra';
export type InApp = { app: InAppName; label: string; os: 'android' | 'ios' | 'otro' };

const LABEL: Record<InAppName, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', otra: 'esta app' };

export function detectInApp(ua: string): InApp | null {
  const t = ua || '';
  const os: InApp['os'] = /android/i.test(t) ? 'android' : /iphone|ipad|ipod/i.test(t) ? 'ios' : 'otro';
  let app: InAppName | null = null;
  if (/musical_ly|bytedance|tiktok|trill/i.test(t)) app = 'tiktok';
  else if (/instagram/i.test(t)) app = 'instagram';
  else if (/FBAN|FBAV|FB_IAB|FBIOS/.test(t)) app = 'facebook';
  // WebView de Android genérico («; wv)») de otras apps.
  else if (os === 'android' && /;\s*wv\)/.test(t)) app = 'otra';
  return app ? { app, label: LABEL[app], os } : null;
}

/**
 * Enlace que intenta abrir la misma página en el navegador del sistema:
 * Android → Chrome con un intent; iPhone (iOS 17+) → Safari con `x-safari-https`. null si no hay forma directa.
 */
export function openInBrowserHref(url: string, os: InApp['os']): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const rest = `${u.host}${u.pathname}${u.search}`;
  if (os === 'android') return `intent://${rest}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  if (os === 'ios') return `x-safari-${u.protocol.replace(':', '')}://${rest}`;
  return null;
}

/** Qué tocar para abrirlo a mano en cada app. */
export function manualSteps(a: InApp): string {
  if (a.app === 'tiktok') return a.os === 'ios'
    ? 'Toca ··· arriba a la derecha y elige «Abrir en el navegador».'
    : 'Toca ⋮ arriba a la derecha y elige «Abrir en el navegador».';
  if (a.app === 'instagram') return 'Toca ··· arriba a la derecha y elige «Abrir en el navegador externo».';
  if (a.app === 'facebook') return 'Toca ··· arriba a la derecha y elige «Abrir en el navegador».';
  return 'Abre el menú de esta pantalla y elige «Abrir en el navegador».';
}
