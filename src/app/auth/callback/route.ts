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
      const { data: profile } = await supabase
        .from('user_profiles').select('onboarding_completed').eq('user_id', data.user.id).single();
      const dest = profile?.onboarding_completed ? (safeNext ?? '/chat') : '/onboarding';
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
