import { createAdminClient } from '@/lib/supabase/server';
import { SUPPORTED_COUNTRIES } from '@/config/crisis-resources';

/** País (ISO de 2 letras) que Vercel calcula por la IP; la IP no se lee ni se guarda. */
export function ipCountry(h: Headers): string | null {
  const c = h.get('x-vercel-ip-country')?.trim().toUpperCase();
  return c && /^[A-Z]{2}$/.test(c) ? c : null;
}

/**
 * Guarda el país de origen la primera vez (`geo_country`, nunca se pisa: viajar no cambia de dónde eres).
 * `setCountry`: además lo usa como país del perfil si está soportado (líneas de ayuda), para cuentas que no lo eligen.
 */
export async function rememberGeoCountry(userId: string, code: string | null, opts: { setCountry?: boolean } = {}) {
  if (!code) return;
  const db = createAdminClient();
  const { error } = await db.from('user_profiles').update({ geo_country: code }).eq('user_id', userId).is('geo_country', null);
  if (error) { console.error('[geo] país de origen', error.message); return; }
  if (opts.setCountry && SUPPORTED_COUNTRIES.includes(code)) {
    await db.from('user_profiles').update({ country: code }).eq('user_id', userId);
  }
}
