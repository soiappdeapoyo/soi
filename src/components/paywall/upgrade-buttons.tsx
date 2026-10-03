'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PLANS, type PlanKey } from '@/config/plans';
import { track } from '@/components/providers/analytics';

export function UpgradeButtons() {
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(plan: PlanKey) {
    setLoading(plan);
    setError(null);
    track('checkout_started', { plan });
    const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    if (!res.ok) { setError('No pudimos iniciar el pago. Intenta de nuevo.'); setLoading(null); return; }
    const { url } = (await res.json()) as { url: string };
    window.location.href = url;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(PLANS) as PlanKey[]).map((k) => {
        const p = PLANS[k];
        const yearly = p.interval === 'year';
        return (
          <div key={k} className={`relative rounded-[20px] bg-white p-5 ${yearly ? 'shadow-[0_0_0_2px_var(--color-soi-gold),0_8px_24px_rgb(0_0_0/0.05)]' : 'shadow-soft'}`}>
            {'badge' in p && <span className="absolute -top-3 right-4 rounded-md bg-soi-gold px-2.5 py-1 text-xs font-semibold text-soi-ink">{p.badge}</span>}
            <p className="font-semibold">{p.label}</p>
            <p className="nums mt-1 text-3xl font-semibold">${p.price}<span className="text-base font-normal text-soi-muted"> USD/{yearly ? 'año' : 'mes'}</span></p>
            {yearly && <p className="nums text-sm text-soi-muted">≈ ${(p.price / 12).toFixed(2)} USD al mes</p>}
            <Button variant={yearly ? 'gold' : 'primary'} className="mt-4 w-full" onClick={() => go(k)} disabled={loading !== null} aria-busy={loading === k}>
              {loading === k ? 'Redirigiendo…' : `Elegir ${yearly ? 'anual' : 'mensual'}`}
            </Button>
          </div>
        );
      })}
      {error && <p role="alert" className="text-sm text-soi-danger sm:col-span-2">{error}</p>}
    </div>
  );
}
