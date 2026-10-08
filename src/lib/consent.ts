import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Consentimiento legal: antes de usar la app, cada persona acepta los términos y el aviso de privacidad y declara
 * ser mayor de 18 años. Si se publica una versión nueva de los términos o del aviso, se vuelve a pedir.
 */

/** Texto exacto de cada declaración: se guarda tal cual en la constancia. */
export const CONSENT_STATEMENTS = {
  terms: 'Leí y acepto los Términos y condiciones y el Aviso de privacidad de SOI.',
  adult: 'Declaro que soy mayor de 18 años.',
} as const;

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

/** Destino seguro tras aceptar (solo rutas internas). */
export function safeNext(next: string | null | undefined, fallback = '/hoy') {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/consentimiento') ? next : fallback;
}
