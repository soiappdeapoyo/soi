/**
 * Lee el token de acceso de la cookie de sesión de @supabase/ssr SIN renovarla (puro y testeado).
 *
 * Por qué: las peticiones que salen cuando la app pasa a segundo plano (sendBeacon de la navegación, el avance de un
 * Moment al pausarse) no siempre reciben su respuesta: en iPhone la app se suspende justo ahí. Si el servidor renovaba
 * la sesión en esa petición, la cookie nueva se perdía, el teléfono se quedaba con el token de renovación ya gastado
 * y la siguiente vez que abría SOI, Supabase lo veía reusado y cerraba la sesión completa. Esas peticiones solo
 * verifican el token que traen; renovar queda para las pantallas y las llamadas con la app a la vista.
 *
 * Formato: `sb-<ref>-auth-token` (o partido en `.0`, `.1`…), valor `base64-<base64url(JSON)>` o el JSON tal cual.
 */
const NAME = /^(sb-[^.]+-auth-token)(?:\.(\d+))?$/;
const BASE64_PREFIX = 'base64-';

export function accessTokenFromCookies(all: { name: string; value: string }[]): string | null {
  type Group = { whole?: string; chunks: Map<number, string> };
  const groups = new Map<string, Group>();
  for (const c of all) {
    const m = NAME.exec(c.name);
    if (!m) continue;
    const g: Group = groups.get(m[1]!) ?? { chunks: new Map() };
    if (m[2] === undefined) g.whole = c.value;
    else g.chunks.set(Number(m[2]), c.value);
    groups.set(m[1]!, g);
  }
  for (const g of groups.values()) {
    let raw = g.whole;
    if (raw === undefined && g.chunks.size) {
      raw = '';
      for (let i = 0; g.chunks.has(i); i++) raw += g.chunks.get(i);
    }
    const token = raw ? parseToken(raw) : null;
    if (token) return token;
  }
  return null;
}

function parseToken(raw: string): string | null {
  try {
    const text = raw.startsWith(BASE64_PREFIX) ? Buffer.from(raw.slice(BASE64_PREFIX.length), 'base64url').toString('utf8') : decodeURIComponent(raw);
    const s = JSON.parse(text) as unknown;
    if (Array.isArray(s)) return typeof s[0] === 'string' ? s[0] : null;
    const t = (s as { access_token?: unknown } | null)?.access_token;
    return typeof t === 'string' && t ? t : null;
  } catch {
    return null;
  }
}
