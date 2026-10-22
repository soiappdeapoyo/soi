'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { ExternalLink, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { browserTag, IN_APP_NAME, inAppBrowser, isAndroid, isIOS, openInBrowserHref, openInBrowserSteps, type InApp } from '@/lib/in-app-browser';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { authFailureMessage } from '@/lib/auth-errors';
import { trackFunnel, visitorId } from '@/lib/analytics/funnel-client';

/**
 * Enlace del correo con flujo implícito (sin PKCE): PKCE exige abrir el enlace en el mismo navegador donde se
 * pidió, y desde TikTok o Instagram el correo lo abre en Safari o Chrome ("El inicio se interrumpió").
 * Este cliente solo envía el correo; la sesión la guarda /auth/confirm en el navegador donde se abra.
 */
function emailClient() {
  return createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

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

/**
 * Dentro de TikTok, Instagram o Facebook: Google no deja entrar desde su navegador. Se ofrece abrir SOI en el
 * navegador del teléfono (Android: un toque; iPhone: el menú ⋯) y, aquí mismo, el enlace por correo.
 */
function InAppNotice({ app, ua }: { app: InApp; ua: string }) {
  const [copied, setCopied] = useState(false);
  const here = typeof window !== 'undefined' ? window.location.href : '';
  const android = isAndroid(ua);
  const copy = async () => {
    try { await navigator.clipboard.writeText(here); setCopied(true); trackFunnel('cta_click', `abrir_navegador:copiar:${app}`); } catch { /* sin portapapeles */ }
  };
  return (
    <div className="rounded-[16px] bg-soi-sidebar p-4 text-sm">
      <p className="font-medium">Estás dentro de {IN_APP_NAME[app]}.</p>
      <p className="mt-1 text-soi-muted">Google no deja entrar desde aquí. Abre SOI en tu navegador para entrar con Google, o recibe un enlace en tu correo aquí abajo.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {android && (
          <a href={here ? openInBrowserHref(here) : '#'} onClick={() => trackFunnel('cta_click', `abrir_navegador:android:${app}`)}
            className="press inline-flex h-10 items-center gap-2 rounded-[12px] bg-soi-ink px-4 font-medium text-white">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir en mi navegador
          </a>
        )}
        <Button size="sm" variant="outline" onClick={copy} className="h-10">
          <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? 'Enlace copiado' : 'Copiar enlace'}
        </Button>
      </div>
      <p className="mt-3 text-xs text-soi-muted">{android ? 'Si no se abre: ' : ''}{openInBrowserSteps(app, isIOS(ua))}</p>
    </div>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(authFailureMessage(params.get('error')));
  const [inApp, setInApp] = useState<InApp | null>(null);
  const [ua, setUa] = useState('');
  const [tag, setTag] = useState('navegador');

  // Embudo: llegó a la pantalla de entrar (desde la landing o directo), en qué navegador y con qué error.
  useEffect(() => {
    const agent = navigator.userAgent;
    setUa(agent);
    setInApp(inAppBrowser(agent));
    setTag(browserTag(agent));
    const err = params.get('error');
    trackFunnel('login_view', err ? `tras_error:${err}:${browserTag(agent)}` : browserTag(agent));
  }, [params]);

  // El visitante viaja en el enlace: si se abre en otro navegador, el registro se une a este intento.
  const redirectTo = (via?: 'correo') => {
    const q = new URLSearchParams();
    if (next) q.set('next', next);
    const vid = visitorId();
    if (vid) q.set('vid', vid);
    if (via) q.set('via', via);
    const qs = q.toString();
    return `${window.location.origin}/auth/callback${qs ? `?${qs}` : ''}`;
  };

  async function google() {
    // Un solo inicio a la vez: un segundo toque reemplazaría la verificación del primero y fallaría.
    if (loading) return;
    setLoading('google');
    setError(null);
    trackFunnel('auth_start', `google:${tag}`);
    const { error: e } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } },
    });
    if (e) { setError(e.message); setLoading(null); }
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setLoading('email');
    trackFunnel('auth_start', `correo:${tag}`);
    const { error: err } = await emailClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo('correo') } });
    setLoading(null);
    if (err) setError(err.message); else setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {inApp ? (
        <InAppNotice app={inApp} ua={ua} />
      ) : (
        <>
          <Button onClick={google} variant="outline" size="lg" disabled={loading !== null} className="w-full">
            <GoogleLogo /> {loading === 'google' ? 'Conectando…' : 'Continuar con Google'}
          </Button>
          <div className="flex items-center gap-3 text-xs text-soi-muted"><span className="h-px flex-1 bg-black/10" />o con tu correo<span className="h-px flex-1 bg-black/10" /></div>
        </>
      )}
      {sent ? (
        <p role="status" className="rounded-[14px] bg-soi-gold/10 p-4 text-center">Te enviamos un enlace a <strong>{email}</strong>. Revisa tu bandeja ✨{inApp && <><br /><span className="text-sm text-soi-muted">Ábrelo desde tu correo: funciona en cualquier navegador.</span></>}</p>
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
