import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getConsentState } from '@/lib/consent';
import { authFailureReason } from '@/lib/auth-errors';

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

  // Sin formulario previo: SOI conoce a la persona conversando desde el primer mensaje.
  // Solo el consentimiento legal (términos, aviso y mayoría de edad) va antes, y luego a donde iba.
  const dest = safeNext ?? '/hoy';
  const { state } = await getConsentState(data.user.id);
  if (state !== 'ok') return NextResponse.redirect(`${origin}/consentimiento?next=${encodeURIComponent(dest)}`);
  return NextResponse.redirect(`${origin}${dest}`);
}
