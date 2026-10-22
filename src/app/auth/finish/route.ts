import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { completeSignIn, safeNextPath } from '@/lib/auth-complete';

/** Después del enlace del correo (/auth/confirm ya guardó la sesión en este navegador): embudo y destino. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get('next'));
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'auth');
    if (next) url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  }
  return completeSignIn(request, supabase, user, next);
}
