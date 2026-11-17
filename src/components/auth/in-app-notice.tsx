'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { detectInApp, manualSteps, openInBrowserHref, type InApp } from '@/lib/in-app-browser';
import { buttonClass } from '@/components/ui/button';
import { track } from '@/components/providers/analytics';
import { trackFunnel } from '@/lib/analytics/funnel-client';
import { cn } from '@/lib/utils';

/**
 * Dentro de TikTok, Instagram o Facebook, Google no deja entrar: antes del botón se pide abrir SOI en el
 * navegador (un toque cuando se puede; si no, cómo hacerlo y copiar el enlace). Fuera de esas apps no muestra nada.
 * `onDetect` avisa al formulario para que el botón de Google quede como segunda opción.
 */
export function InAppNotice({ onDetect }: { onDetect?: (inApp: boolean) => void }) {
  const [inApp, setInApp] = useState<InApp | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const found = detectInApp(navigator.userAgent);
    setInApp(found);
    onDetect?.(Boolean(found));
    if (found) {
      track('inapp_login_notice', { app: found.app, os: found.os });
      trackFunnel('cta_click', `inapp:${found.app}:visto`);
    }
  }, [onDetect]);

  if (!inApp) return null;
  const here = typeof window !== 'undefined' ? window.location.href : '';
  const open = openInBrowserHref(here, inApp.os);

  async function copy() {
    try {
      await navigator.clipboard.writeText(here);
      setCopied(true);
      trackFunnel('cta_click', `inapp:${inApp!.app}:copiar`);
    } catch { /* sin portapapeles: quedan las instrucciones */ }
  }

  return (
    <div role="status" className="rounded-[20px] bg-soi-accent-soft p-4 text-soi-ink">
      <p className="font-medium">Ábrelo en tu navegador para entrar</p>
      <p className="mt-1 text-[15px] text-soi-muted">
        Estás dentro de {inApp.label} y Google no deja iniciar sesión desde aquí. Es un paso y lo tuyo se queda igual.
      </p>
      {open && (
        <a
          href={open}
          onClick={() => trackFunnel('cta_click', `inapp:${inApp.app}:abrir`)}
          className={buttonClass('primary', 'lg', 'mt-3 w-full')}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir en {inApp.os === 'ios' ? 'Safari' : 'Chrome'}
        </a>
      )}
      <p className="mt-3 text-sm text-soi-muted">{open ? 'Si no se abre: ' : ''}{manualSteps(inApp)}</p>
      <button type="button" onClick={copy} className={cn(buttonClass('outline', 'md', 'mt-3 w-full bg-white'))}>
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? 'Enlace copiado: pégalo en tu navegador' : 'Copiar enlace'}
      </button>
    </div>
  );
}
