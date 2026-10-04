/** Enlaces del perfil de creador (como Instagram): hasta 5, solo http(s), con etiqueta opcional. */
export type ProfileLink = { label: string; url: string };
export const MAX_PROFILE_LINKS = 5;

const BLOCKED_HOSTS = /^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0|\[)/i;

/** Normaliza una URL escrita por una persona. Devuelve null si no es un enlace web público válido. */
export function normalizeLink(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 300 || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try { u = new URL(withScheme); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (!u.hostname.includes('.') || BLOCKED_HOSTS.test(u.hostname)) return null;
  return u.toString();
}

/** "instagram.com/valeria" — lo que se muestra cuando no hay etiqueta. */
export function displayLink(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return `${u.hostname.replace(/^www\./, '')}${path}`.slice(0, 48);
  } catch { return url.slice(0, 48); }
}

export function parseLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((l): l is ProfileLink => Boolean(l) && typeof l === 'object' && typeof (l as ProfileLink).url === 'string')
    .map((l) => ({ label: typeof l.label === 'string' ? l.label : '', url: l.url }))
    .filter((l) => normalizeLink(l.url) === l.url)
    .slice(0, MAX_PROFILE_LINKS);
}
