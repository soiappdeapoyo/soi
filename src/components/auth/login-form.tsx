'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { authFailureMessage } from '@/lib/auth-errors';
import { trackFunnel } from '@/lib/analytics/funnel-client';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** `role="persons"`: registro desde /persons/entrar (la cuenta nueva es de /persons y vuelve ahí). */
export function LoginForm({ role }: { role?: 'persons' } = {}) {
  const params = useSearchParams();
  const next = params.get('next') ?? (role === 'persons' ? '/persons' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(authFailureMessage(params.get('error')));

  // Embudo: llegó a la pantalla de entrar (desde la landing o directo).
  useEffect(() => { trackFunnel('login_view', role ?? (params.get('error') ? 'tras_error' : undefined)); }, [params, role]);

  const redirectTo = () => {
    const q = new URLSearchParams();
    if (next) q.set('next', next);
    if (role) q.set('rol', role);
    // Invitación de /persons: el código del link viaja hasta el registro.
    const ref = params.get('ref');
    if (role === 'persons' && ref && /^[a-z0-9]{8}$/.test(ref)) q.set('ref', ref);
    const qs = q.toString();
    return `${window.location.origin}/auth/callback${qs ? `?${qs}` : ''}`;
  };

  async function google() {
    // Un solo inicio a la vez: un segundo toque reemplazaría la verificación del primero y fallaría.
    if (loading) return;
    setLoading(true);
    setError(null);
    trackFunnel('auth_start', 'google');
    const { error: e } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } },
    });
    if (e) { setError(e.message); setLoading(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={google} variant="outline" size="lg" disabled={loading} className="w-full">
        <GoogleLogo /> {loading ? 'Conectando…' : 'Continuar con Google'}
      </Button>
      {error && <p role="alert" className="text-center text-sm text-soi-danger">{error}</p>}
    </div>
  );
}
