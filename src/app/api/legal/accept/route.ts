import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { CONSENT_STATEMENTS, recordAcceptance } from '@/lib/consent';

const Body = z.object({ accept: z.literal(true) });

/**
 * Registra la aceptación cuando cambian los términos o el aviso (la casilla y «Continuar»). Al entrar por
 * primera vez se registra en /auth/callback, sin esta pantalla.
 */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!Body.safeParse(await req.json().catch(() => null)).success) {
    return Response.json({ ok: false, message: 'No pudimos guardar tu aceptación. Intenta de nuevo.' }, { status: 400 });
  }
  const profile = await getProfile(user.id);
  const ok = await recordAcceptance({
    userId: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    statement: CONSENT_STATEMENTS[profile?.app_role === 'persons' ? 'persons' : 'soi'],
    headers: req.headers,
  });
  if (!ok) return Response.json({ ok: false, message: 'No pudimos guardar tu aceptación. Intenta de nuevo.' }, { status: 500 });
  return Response.json({ ok: true });
}
