import { z } from 'zod';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { CONSENT_STATEMENTS, currentLegalVersions } from '@/lib/consent';

const Body = z.object({ acceptTerms: z.literal(true), adult: z.literal(true) });

/**
 * Registra la aceptación de los términos y el aviso de privacidad y la declaración de mayoría de edad.
 * Las versiones aceptadas se toman en el servidor (las vigentes), no de lo que envía el navegador.
 */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!Body.safeParse(await req.json().catch(() => null)).success) {
    return Response.json({ ok: false, message: 'Para continuar, marca las dos casillas.' }, { status: 400 });
  }

  const [versions, profile] = await Promise.all([currentLegalVersions(), getProfile(user.id)]);
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '').trim().slice(0, 100) || null;
  const { error } = await createAdminClient().from('legal_acceptances').insert({
    user_id: user.id,
    email: user.email ?? null,
    display_name: profile?.display_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    terms_version: versions.terminos,
    privacy_version: versions.privacidad,
    privacy_short_version: versions.privacidad_corto,
    accepted_terms: true,
    confirmed_adult: true,
    statements: [CONSENT_STATEMENTS.terms, CONSENT_STATEMENTS.adult],
    ip,
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
  });
  if (error) {
    console.error('[legal] no se pudo registrar la aceptación', error.message);
    return Response.json({ ok: false, message: 'No pudimos guardar tu aceptación. Intenta de nuevo.' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
