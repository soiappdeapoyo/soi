'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

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

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(params.get('error') ? 'No pudimos iniciar sesión. Intenta de nuevo.' : null);

  const redirectTo = () => `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  async function google() {
    setLoading('google');
    const { error: e } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } },
    });
    if (e) { setError(e.message); setLoading(null); }
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setLoading('email');
    const { error: err } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setLoading(null);
    if (err) setError(err.message); else setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={google} variant="outline" size="lg" disabled={loading !== null} className="w-full">
        <GoogleLogo /> {loading === 'google' ? 'Conectando…' : 'Continuar con Google'}
      </Button>
      <div className="flex items-center gap-3 text-xs text-soi-muted"><span className="h-px flex-1 bg-black/10" />o con tu correo<span className="h-px flex-1 bg-black/10" /></div>
      {sent ? (
        <p role="status" className="rounded-2xl bg-soi-gold/10 p-4 text-center">Te enviamos un enlace a <strong>{email}</strong>. Revisa tu bandeja ✨</p>
      ) : (
        <form onSubmit={magic} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="login-email">Correo electrónico</Label>
            <Input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <Button type="submit" size="lg" disabled={loading !== null}>{loading === 'email' ? 'Enviando…' : 'Recibir enlace mágico'}</Button>
        </form>
      )}
      {error && <p role="alert" className="text-center text-sm text-soi-danger">{error}</p>}
    </div>
  );
}
