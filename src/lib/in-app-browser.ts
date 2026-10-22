/**
 * Navegadores dentro de otras apps (puro y testeado). Quien llega desde TikTok o Instagram abre SOI en el
 * navegador de esa app: Google no deja iniciar sesión ahí (error `disallowed_useragent`), así que /login lo
 * reconoce, no ofrece Google y ayuda a abrir SOI en el navegador del teléfono.
 */

export type InApp = 'tiktok' | 'instagram' | 'facebook' | 'otra';
/** Para el embudo: en qué navegador empezó a entrar. */
export type BrowserTag = InApp | 'navegador';

export function inAppBrowser(ua: string | null | undefined): InApp | null {
  const u = ua ?? '';
  if (/musical_ly|bytedancewebview|trill_|tiktok/i.test(u)) return 'tiktok';
  if (/instagram/i.test(u)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS|messenger/i.test(u)) return 'facebook';
  if (/\bLine\/|Snapchat|Pinterest|Twitter|LinkedInApp|; wv\)/i.test(u)) return 'otra';
  return null;
}

export const browserTag = (ua: string | null | undefined): BrowserTag => inAppBrowser(ua) ?? 'navegador';

export const isAndroid = (ua: string | null | undefined) => /android/i.test(ua ?? '');
export const isIOS = (ua: string | null | undefined) => /iphone|ipad|ipod/i.test(ua ?? '');

/** Nombre de la app para los textos. */
export const IN_APP_NAME: Record<InApp, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', otra: 'esta app' };

/**
 * Android: un enlace `intent://` le pide al sistema abrir la página en el navegador del teléfono
 * (si no puede, `browser_fallback_url` la deja donde está). En iPhone no existe: solo instrucciones.
 */
export function openInBrowserHref(url: string): string {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

/** Cómo abrirlo a mano en cada app (el menú de los tres puntos). */
export function openInBrowserSteps(app: InApp, ios: boolean): string {
  if (app === 'tiktok') return 'Toca ⋯ arriba a la derecha y elige «Abrir en el navegador».';
  if (app === 'instagram') return `Toca ⋯ arriba a la derecha y elige «Abrir en ${ios ? 'el navegador externo' : 'Chrome'}».`;
  if (app === 'facebook') return 'Toca ⋯ arriba a la derecha y elige «Abrir en el navegador».';
  return `Abre el menú de la app y elige «Abrir en ${ios ? 'Safari' : 'el navegador'}».`;
}
