'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authFailureReason } from '@/lib/auth-errors';

/**
 * Enlace del correo (flujo implícito: la sesión llega en el fragmento `#access_token=…`). A diferencia de PKCE,
 * funciona aunque se abra en otro navegador que donde se pidió: desde TikTok, el correo abre Safari o Chrome.
 * Se quita el fragmento de la barra antes de crear el cliente y se guarda la sesión en las cookies de este navegador.
 */
export function ConfirmSession() {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    const next = query.get('next');
    const vid = query.get('vid');

    const toLogin = (reason: string) => {
      const url = new URL('/login', window.location.origin);
      url.searchParams.set('error', reason);
      if (next) url.searchParams.set('next', next);
      window.location.replace(url.toString());
    };

    const error = hash.get('error') ?? query.get('error');
    if (error) {
      console.error('[auth] enlace del correo con error', error, hash.get('error_code') ?? query.get('error_code') ?? '');
      return toLogin(authFailureReason(`${error} ${hash.get('error_code') ?? query.get('error_code') ?? ''} ${hash.get('error_description') ?? query.get('error_description') ?? ''}`));
    }
    const access_token = hash.get('access_token');
    const refresh_token = hash.get('refresh_token');
    if (!access_token || !refresh_token) return toLogin('auth');

    void createClient().auth.setSession({ access_token, refresh_token }).then(({ error: e }) => {
      if (e) { console.error('[auth] no se pudo guardar la sesión', e.message); setFailed(true); return toLogin(authFailureReason(e.message)); }
      const finish = new URL('/auth/finish', window.location.origin);
      if (next) finish.searchParams.set('next', next);
      if (vid) finish.searchParams.set('vid', vid);
      window.location.replace(finish.toString());
    });
  }, []);

  return <p role="status" className="mt-4 text-soi-muted">{failed ? 'No pudimos entrar con este enlace…' : 'Entrando a SOI…'}</p>;
}
