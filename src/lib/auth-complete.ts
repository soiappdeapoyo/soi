import { NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { createAdminClient, type createServerClient } from '@/lib/supabase/server';
import { getConsentState } from '@/lib/consent';
import { isBrandNew } from '@/lib/journey';
import { countryName, geoFromHeaders, VISITOR_COOKIE, visitorFrom } from '@/lib/analytics/funnel';
import { isAdminEmail } from '@/lib/admin/auth';
import { notifyAdmins } from '@/lib/admin/notify';

type Supabase = Awaited<ReturnType<typeof createServerClient>>;

/** `next` seguro: solo rutas propias. */
export function safeNextPath(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

/**
 * Lo que pasa al entrar (Google en /auth/callback, enlace del correo en /auth/finish): anota registro o inicio en
 * el embudo, avisa a administración de un registro y lleva a la persona a su destino (consentimiento antes si falta).
 *
 * El visitante del embudo es la cookie de este navegador o, si el enlace se abrió en otro (el correo abre Safari
 * o Chrome aunque se pidiera desde TikTok), el `vid` que viajó en el enlace: así el registro se une a su intento.
 */
export async function completeSignIn(request: Request, supabase: Supabase, u: User, next: string | null): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const geo = geoFromHeaders(request.headers);
  const cookieVid = visitorFrom((await cookies()).get(VISITOR_COOKIE)?.value);
  const linkVid = visitorFrom(searchParams.get('vid'));
  const visitor = linkVid ?? cookieVid;
  const otherBrowser = Boolean(linkVid && linkVid !== cookieVid);

  after(async () => {
    const db = createAdminClient();
    // Registro = cuenta creada hace menos de 10 min y sin registro anotado antes (un segundo enlace no cuenta doble).
    // Con el enlace del correo puede pasar más tiempo entre pedirlo y abrirlo: 60 min.
    const fresh = Date.now() - Date.parse(u.created_at) < 60 * 60_000;
    const { data: prior } = fresh
      ? await db.from('funnel_events').select('id').eq('user_id', u.id).eq('event', 'signup').limit(1)
      : { data: [] as { id: number }[] };
    const isSignup = fresh && !prior?.length;
    const provider = (u.app_metadata?.provider as string | undefined)?.slice(0, 30) ?? 'desconocido';
    const { error: e } = await db.from('funnel_events').insert({
      visitor_id: visitor, event: isSignup ? 'signup' : 'login', user_id: u.id,
      detail: `${provider}${otherBrowser ? ':otro_navegador' : ''}`, ...geo,
    });
    if (e) console.error('[funnel] no se pudo anotar la entrada', e.message);
    if (isSignup && !isAdminEmail(u.email) && !/\.demo@soi\.app$/i.test(u.email ?? '')) {
      const where = [geo.city, geo.country ? countryName(geo.country) : null].filter(Boolean).join(', ');
      await notifyAdmins({ title: 'Nuevo registro en SOI', body: `${u.email ?? 'Una persona'}${where ? ` · ${where}` : ''}`, url: '/panel/notificaciones' });
    }
  });

  // Sin formulario previo: SOI conoce a la persona conversando desde el primer mensaje.
  // Solo el consentimiento legal (términos, aviso y mayoría de edad) va antes, y luego a donde iba.
  // Primera vez de verdad (sin mensajes ni Moments): su primer paso es contarle a SOI cómo llega, no un Hoy vacío.
  const dest = next ?? ((await isBrandNewUser(supabase, u.id)) ? '/chat?nueva=1' : '/hoy');
  const { state } = await getConsentState(u.id);
  const res = NextResponse.redirect(state !== 'ok' ? `${origin}/consentimiento?next=${encodeURIComponent(dest)}` : `${origin}${dest}`);
  // Este navegador no tenía la cookie del embudo: se la damos para que lo que siga cuente para el mismo visitante.
  if (otherBrowser && linkVid) {
    res.cookies.set(VISITOR_COOKIE, linkVid, { maxAge: 30 * 86_400, path: '/', sameSite: 'lax', secure: origin.startsWith('https:') });
  }
  return res;
}

/** Sin mensajes escritos ni Moments terminados. Ante un error se asume que ya conoce SOI (va a Hoy, como siempre). */
async function isBrandNewUser(supabase: Supabase, userId: string) {
  const [m, r] = await Promise.all([
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user'),
    supabase.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('completed_at', 'is', null),
  ]);
  if (m.error || r.error) return false;
  return isBrandNew({ userMessages: m.count ?? 0, completedRuns: r.count ?? 0 });
}
