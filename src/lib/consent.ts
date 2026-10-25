import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Consentimiento legal: sin ventana aparte. La leyenda va junto al botón de entrar («Al continuar con Google…») y
 * al entrar se registra la constancia. Si se publica una versión nueva de los términos o del aviso, se vuelve a
 * pedir con la misma leyenda y un solo botón (`/consentimiento`).
 */

/** Texto exacto de cada leyenda: se guarda tal cual en la constancia. */
export const CONSENT_STATEMENTS = {
  login: 'Al continuar con Google, aceptas los Términos y condiciones, declaras que leíste el Aviso de privacidad y que eres mayor de 18 años.',
  update: 'Al tocar «Continuar», aceptas los Términos y condiciones, declaras que leíste el Aviso de privacidad y que eres mayor de 18 años.',
} as const;

/** El login lo manda a /auth/callback: la leyenda estaba junto al botón que tocó. */
export const LEGEND_PARAM = 'legal';

export const LEGAL_TAG = 'legal';

export type LegalVersions = { terminos: string | null; privacidad: string | null; privacidad_corto: string | null };
export type AcceptedVersions = { terms_version: string | null; privacy_version: string | null } | null;

/** Versiones vigentes (la publicación más reciente de cada documento). Se invalida al publicar (`LEGAL_TAG`). */
export const currentLegalVersions = unstable_cache(async (): Promise<LegalVersions> => {
  const versions: LegalVersions = { terminos: null, privacidad: null, privacidad_corto: null };
  const { data, error } = await createAdminClient().from('legal_documents')
    .select('id, kind, created_at').order('created_at', { ascending: false }).limit(200);
  if (error) return versions;
  for (const row of data ?? []) {
    const kind = row.kind as keyof LegalVersions;
    if (kind in versions && !versions[kind]) versions[kind] = row.id as string;
  }
  return versions;
}, ['legal-versions'], { tags: [LEGAL_TAG], revalidate: 300 });

/**
 * 'missing': nunca aceptó · 'updated': aceptó otra versión de los términos o del aviso · 'ok'.
 * El aviso simplificado no obliga a aceptar de nuevo (resume el integral).
 */
export function consentState(last: AcceptedVersions, current: LegalVersions): 'missing' | 'updated' | 'ok' {
  if (!last) return 'missing';
  if (last.terms_version !== current.terminos || last.privacy_version !== current.privacidad) return 'updated';
  return 'ok';
}

/** Estado del consentimiento de una persona (una vez por petición). */
export const getConsentState = cache(async (userId: string) => {
  const [current, { data, error }] = await Promise.all([
    currentLegalVersions(),
    createAdminClient().from('legal_acceptances').select('terms_version, privacy_version')
      .eq('user_id', userId).order('accepted_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  // Si la tabla aún no existe (migración sin aplicar), no bloqueamos la app.
  if (error) return { state: 'ok' as const, current };
  return { state: consentState(data, current), current };
});

/** Guarda la constancia (versiones vigentes tomadas en el servidor, nunca del navegador). */
export async function recordAcceptance(input: {
  userId: string; email: string | null; displayName: string | null; statement: string; headers: Headers;
}) {
  const versions = await currentLegalVersions();
  const h = input.headers;
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim().slice(0, 100) || null;
  const { error } = await createAdminClient().from('legal_acceptances').insert({
    user_id: input.userId,
    email: input.email,
    display_name: input.displayName,
    terms_version: versions.terminos,
    privacy_version: versions.privacidad,
    privacy_short_version: versions.privacidad_corto,
    accepted_terms: true,
    confirmed_adult: true,
    statements: [input.statement],
    ip,
    user_agent: h.get('user-agent')?.slice(0, 500) ?? null,
  });
  if (error) console.error('[legal] no se pudo registrar la aceptación', error.message);
  return !error;
}

/** Destino seguro tras aceptar (solo rutas internas). */
export function safeNext(next: string | null | undefined, fallback = '/hoy') {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/consentimiento') ? next : fallback;
}
