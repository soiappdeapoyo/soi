'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { CONSENT_STATEMENTS, type ConsentKind } from '@/lib/consent-text';

const DOCS: Record<string, string> = { 'Términos y condiciones': '/terminos', 'Aviso de privacidad': '/privacidad' };

/**
 * La casilla del consentimiento (sin marcar de inicio) con el texto exacto de la constancia; los documentos abren en
 * otra pestaña para no perder el inicio de sesión. `missing`: tocó entrar sin marcarla.
 */
export const ConsentCheck = forwardRef<HTMLInputElement, {
  kind: ConsentKind; checked: boolean; onChange: (v: boolean) => void; missing?: boolean;
}>(function ConsentCheck({ kind, checked, onChange, missing }, ref) {
  const parts = CONSENT_STATEMENTS[kind].split(/(Términos y condiciones|Aviso de privacidad)/);
  return (
    <div>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-2 text-left text-[13px] leading-5 text-soi-muted ${missing ? 'shadow-[0_0_0_2px_var(--color-soi-danger)]' : ''}`}>
        <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          aria-invalid={missing || undefined} aria-describedby={missing ? 'consent-missing' : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-soi-accent" />
        <span>
          {parts.map((p, i) => DOCS[p]
            ? <Link key={i} href={DOCS[p]} target="_blank" className="font-medium text-soi-ink underline underline-offset-2">{p}</Link>
            : p)}
        </span>
      </label>
      {missing && <p id="consent-missing" role="alert" className="mt-1 text-center text-sm text-soi-danger">Marca la casilla para continuar.</p>}
    </div>
  );
});
