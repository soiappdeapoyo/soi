import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { authFailureReason } from '@/lib/auth-errors';
import { completeSignIn, safeNextPath } from '@/lib/auth-complete';

/**
 * Callback de Google OAuth (PKCE: vuelve al mismo navegador) y puerta del enlace del correo (`via=correo`).
 * El enlace del correo trae la sesión en el fragmento (#access_token=…), que el servidor no ve: se pasa a
 * /auth/confirm y el navegador conserva el fragmento en la redirección. Se usa esta ruta porque ya está en la
 * lista de redirecciones permitidas de Supabase.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const safeNext = safeNextPath(searchParams.get('next'));
  const back = (reason: string) => {
    const url = new URL('/login', origin);
    url.searchParams.set('error', reason);
    if (safeNext) url.searchParams.set('next', safeNext);
    return NextResponse.redirect(url);
  };

  if (searchParams.get('via') === 'correo' && !code) {
    const url = new URL('/auth/confirm', origin);
    for (const k of ['next', 'vid', 'error', 'error_code', 'error_description']) {
      const v = searchParams.get(k);
      if (v) url.searchParams.set(k, k === 'next' ? safeNext ?? '' : v);
    }
    return NextResponse.redirect(url);
  }

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
  return completeSignIn(request, supabase, data.user, safeNext);
}
