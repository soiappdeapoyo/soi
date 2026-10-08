'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const linkClass = 'font-medium text-soi-accent underline underline-offset-2';

/** Casillas del consentimiento legal: aceptar términos y aviso, y declarar mayoría de edad. */
export function ConsentForm({ next }: { next: string }) {
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!terms || !adult) return;
    setBusy(true);
    const res = await fetch('/api/legal/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptTerms: true, adult: true }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); toast(json.message ?? 'No pudimos guardar tu aceptación. Intenta de nuevo.'); return; }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-7 flex flex-col gap-4 text-left">
      <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-6">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-soi-accent" />
        <span>
          Leí y acepto los <Link href="/terminos" target="_blank" className={linkClass}>Términos y condiciones</Link> y
          el <Link href="/privacidad" target="_blank" className={linkClass}>Aviso de privacidad</Link>.
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-6">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-soi-accent" />
        <span>Declaro que soy mayor de 18 años.</span>
      </label>
      <Button type="submit" size="lg" className="mt-3 w-full" disabled={!terms || !adult || busy}>
        {busy ? 'Guardando…' : 'Continuar'}
      </Button>
    </form>
  );
}
