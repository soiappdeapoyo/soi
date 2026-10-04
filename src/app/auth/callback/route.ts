import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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
      return NextResponse.redirect(`${origin}${safeNext ?? '/hoy'}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
