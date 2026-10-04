'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { track } from '@/components/providers/analytics';
import { formatPrice } from '@/config/creators';

type Props = {
  blueprintId: string;
  requiredMinutes: number;
  defaultMinutes: number;
  premium: { priceCents: number; currency: string; purchased: boolean } | null;
  existingImplementationId: string | null;
  locked: boolean;
};

/**
 * "Implementar" = agregar este sistema a mi SOI. La IA lo adapta a tu realidad (nunca una copia exacta).
 */
export function ImplementPanel({ blueprintId, requiredMinutes, defaultMinutes, premium, existingImplementationId, locked }: Props) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (existingImplementationId) {
    return <Link href={`/implementaciones/${existingImplementationId}`} className={buttonClass('primary')}>Continuar mi versión</Link>;
  }
  if (locked) {
    return (
      <div className="rounded-[20px] bg-soi-sidebar p-4">
        <p className="text-sm">Implementar Blueprints es parte de SOI+.</p>
        <Link href="/planes" className={buttonClass('gold', 'sm', 'mt-3')}>Pasar a SOI+</Link>
      </div>
    );
  }

  async function buy() {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/blueprints/${blueprintId}/checkout`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) { setBusy(false); setMsg(json.message ?? 'No se pudo iniciar el pago.'); return; }
    track('blueprint_checkout', { blueprint: blueprintId });
    window.location.href = json.url;
  }

  async function implement(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/blueprints/${blueprintId}/implement`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes, context: context || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); setMsg(json.message ?? 'No se pudo implementar.'); return; }
    track('blueprint_implemented', { blueprint: blueprintId, minutes });
    router.push(`/implementaciones/${json.id}`);
  }

  if (premium && !premium.purchased) {
    return (
      <div className="rounded-[20px] bg-soi-sidebar p-3">
        <div className="rounded-lg bg-white p-4 shadow-ring">
          <p className="text-[15px]">Incluye tu versión adaptada por la IA, seguimiento de {`${requiredMinutes} min`} al día y el método del creador aplicado a tu vida.</p>
          <Button className="mt-3 w-full" onClick={buy} disabled={busy}>{busy ? 'Abriendo pago…' : `Obtener por ${formatPrice(premium.priceCents, premium.currency)}`}</Button>
          {msg && <p role="alert" className="mt-2 text-sm text-soi-danger">{msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={implement} className="rounded-[20px] bg-soi-sidebar p-3">
      <div className="rounded-lg bg-white p-4 shadow-ring">
        <div className="flex items-end gap-3">
          <div className="w-28">
            <Label htmlFor="ip-min">Minutos al día</Label>
            <Input id="ip-min" type="number" inputMode="numeric" min={1} max={240} value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))} className="nums" />
          </div>
          <p className="pb-2 text-sm text-soi-muted">{minutes < requiredMinutes ? `El original pide ${requiredMinutes}. SOI creará una versión para tu realidad.` : 'SOI ajustará los pasos a tu vida.'}</p>
        </div>
        <Label htmlFor="ip-ctx" className="mt-3">Algo que SOI deba saber (opcional)</Label>
        <Textarea id="ip-ctx" value={context} onChange={(e) => setContext(e.target.value)} maxLength={300} rows={2} placeholder="Ej. Trabajo de noche, tengo dos hijos pequeños…" />
        <Button type="submit" className="mt-3 w-full" disabled={busy}>
          <Sparkles className="h-4 w-4" aria-hidden="true" /> {busy ? 'Adaptando a tu realidad…' : 'Implementar en mi SOI'}
        </Button>
        {msg && <p role="alert" className="mt-2 text-sm text-soi-danger">{msg}</p>}
      </div>
    </form>
  );
}
