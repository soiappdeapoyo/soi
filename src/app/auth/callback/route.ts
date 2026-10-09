import { NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { getConsentState } from '@/lib/consent';
import { authFailureReason } from '@/lib/auth-errors';
import { createAdminClient } from '@/lib/supabase/server';
import { countryName, geoFromHeaders, VISITOR_COOKIE, visitorFrom } from '@/lib/analytics/funnel';
import { isAdminEmail } from '@/lib/admin/auth';
import { notifyAdmins } from '@/lib/admin/notify';

/** Callback de Google OAuth y magic link. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const back = (reason: string) => {
    const url = new URL('/login', origin);
    url.searchParams.set('error', reason);
    if (safeNext) url.searchParams.set('next', safeNext);
    return NextResponse.redirect(url);
  };

  // Google o Supabase pueden volver sin código (la persona canceló, enlace vencido…).
  const providerError = searchParams.get('error');
  if (providerError || !code) {
    const description = searchParams.get('error_description') ?? '';
    console.error('[auth] callback sin código', providerError ?? 'sin_error', searchParams.get('error_code') ?? '', description.slice(0, 200));
    return back(authFailureReason(`${providerError ?? ''} ${searchParams.get('error_code') ?? ''} ${description}`));
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error('[auth] no se pudo canjear el código', error?.code ?? '', error?.status ?? '', error?.message ?? 'sin usuario');
    return back(authFailureReason(`${error?.code ?? ''} ${error?.message ?? ''}`));
  }

  // Embudo y aviso de registro, después de responder (no retrasa la entrada).
  const u = data.user;
  const geo = geoFromHeaders(request.headers);
  const visitor = visitorFrom((await cookies()).get(VISITOR_COOKIE)?.value);
  after(async () => {
    const db = createAdminClient();
    // Registro = cuenta creada hace menos de 10 min y sin registro anotado antes (un segundo enlace no cuenta doble).
    const fresh = Date.now() - Date.parse(u.created_at) < 10 * 60_000;
    const { data: prior } = fresh
      ? await db.from('funnel_events').select('id').eq('user_id', u.id).eq('event', 'signup').limit(1)
      : { data: [] as { id: number }[] };
    const isSignup = fresh && !prior?.length;
    const { error: e } = await db.from('funnel_events').insert({
      visitor_id: visitor, event: isSignup ? 'signup' : 'login', user_id: u.id,
      detail: (u.app_metadata?.provider as string | undefined)?.slice(0, 60) ?? null, ...geo,
    });
    if (e) console.error('[funnel] no se pudo anotar la entrada', e.message);
    if (isSignup && !isAdminEmail(u.email) && !/\.demo@soi\.app$/i.test(u.email ?? '')) {
      const where = [geo.city, geo.country ? countryName(geo.country) : null].filter(Boolean).join(', ');
      await notifyAdmins({ title: 'Nuevo registro en SOI', body: `${u.email ?? 'Una persona'}${where ? ` · ${where}` : ''}`, url: '/panel/notificaciones' });
    }
  });

  // Sin formulario previo: SOI conoce a la persona conversando desde el primer mensaje.
  // Solo el consentimiento legal (términos, aviso y mayoría de edad) va antes, y luego a donde iba.
  const dest = safeNext ?? '/hoy';
  const { state } = await getConsentState(data.user.id);
  if (state !== 'ok') return NextResponse.redirect(`${origin}/consentimiento?next=${encodeURIComponent(dest)}`);
  return NextResponse.redirect(`${origin}${dest}`);
}
