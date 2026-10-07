'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import type { AppSettings } from '@/lib/settings';

const NUM: { key: keyof AppSettings; label: string; hint: string; min: number; max: number }[] = [
  { key: 'trialDays', label: 'Días de prueba', hint: 'Para quien se registre desde ahora (las pruebas en curso no cambian).', min: 0, max: 60 },
  { key: 'freeQueryLimit', label: 'Consultas gratis (plan Free)', hint: 'Mensajes de chat al terminar la prueba.', min: 0, max: 1000 },
  { key: 'ttsDailyMinutes', label: 'Minutos de voz nueva por día', hint: 'Audio generado por persona y día (lo ya generado no cuenta).', min: 0, max: 600 },
  { key: 'chatMaxOutputTokens', label: 'Tokens máximos por respuesta', hint: '0 = sin tope propio (el del proveedor).', min: 0, max: 8000 },
  { key: 'dailyTokenLimitFree', label: 'Tokens por día · Free', hint: '0 = sin límite. Al llegar, el chat avisa y sigue mañana (las crisis nunca se bloquean).', min: 0, max: 5_000_000 },
  { key: 'dailyTokenLimitPlus', label: 'Tokens por día · SOI+ y prueba', hint: '0 = sin límite.', min: 0, max: 5_000_000 },
];

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!window.confirm('¿Guardar los ajustes? Se aplican a toda la app en menos de un minuto.')) return;
    setBusy(true);
    const res = await fetch('/api/panel/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(json.message ?? 'No se pudo guardar.'); return; }
    toast('Ajustes guardados');
    router.refresh();
  }

  const plan = (k: 'monthly' | 'yearly', field: 'price' | 'stripePriceId', v: string) =>
    setS((x) => ({ ...x, plans: { ...x.plans, [k]: { ...x.plans[k], [field]: field === 'price' ? Number(v) : (v.trim() || null) } } }));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[20px] bg-white p-5 shadow-ring">
        <h2 className="font-semibold">Tarifas de SOI+</h2>
        <p className="mt-1 text-sm text-soi-muted">El precio que se muestra y el ID de precio de Stripe que se cobra. Para cambiar lo que se cobra, crea el precio en Stripe y pega aquí su ID (si lo dejas vacío, se usa el de las variables de entorno).</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(['monthly', 'yearly'] as const).map((k) => (
            <fieldset key={k} className="rounded-[14px] bg-soi-sidebar p-3">
              <legend className="px-1 text-sm font-medium">{k === 'monthly' ? 'Mensual' : 'Anual'}</legend>
              <Label htmlFor={`p-${k}`} className="text-xs text-soi-muted">Precio (USD)</Label>
              <Input id={`p-${k}`} type="number" step="0.01" min={0} value={s.plans[k].price} onChange={(e) => plan(k, 'price', e.target.value)} className="nums" />
              <Label htmlFor={`s-${k}`} className="mt-2 text-xs text-soi-muted">ID de precio en Stripe</Label>
              <Input id={`s-${k}`} placeholder="price_…" value={s.plans[k].stripePriceId ?? ''} onChange={(e) => plan(k, 'stripePriceId', e.target.value)} />
            </fieldset>
          ))}
        </div>
      </section>

      <section className="rounded-[20px] bg-white p-5 shadow-ring">
        <h2 className="font-semibold">Prueba y límites de uso</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {NUM.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} type="number" min={f.min} max={f.max} className="nums" value={s[f.key] as number}
                onChange={(e) => setS((x) => ({ ...x, [f.key]: Math.max(f.min, Math.min(f.max, Math.round(Number(e.target.value) || 0))) }))} />
              <p className="mt-1 text-xs text-soi-muted">{f.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div><Button onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar ajustes'}</Button></div>
    </div>
  );
}
