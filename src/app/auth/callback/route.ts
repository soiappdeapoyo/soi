import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getConsentState } from '@/lib/consent';

/** Callback de Google OAuth y magic link. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Sin formulario previo: SOI conoce a la persona conversando desde el primer mensaje.
      // Solo el consentimiento legal (términos, aviso y mayoría de edad) va antes, y luego a donde iba.
      const dest = safeNext ?? '/hoy';
      const { state } = await getConsentState(data.user.id);
      if (state !== 'ok') return NextResponse.redirect(`${origin}/consentimiento?next=${encodeURIComponent(dest)}`);
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
