'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { ESLABON_LABEL, type Eslabon } from '@/config/agents';
import { CREATOR_REVENUE_SHARE, DIFFICULTY_LABEL, formatPrice, type Difficulty } from '@/config/creators';
import type { ActionCard } from '@/types/database';
import { ActionListEditor } from './action-list-editor';
import { cn } from '@/lib/utils';

export type BlueprintSeed = { momentId?: string; title?: string; objective?: string; steps?: ActionCard[]; source?: string; eslabon?: Eslabon };

/** Un Blueprint es un protocolo de transformación: objetivo → proceso → acciones → resultado esperado. */
export function BlueprintForm({ seed, creatorName }: { seed: BlueprintSeed; creatorName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(seed.title ?? '');
  const [objective, setObjective] = useState(seed.objective ?? '');
  const [steps, setSteps] = useState<ActionCard[]>(seed.steps?.length ? seed.steps : [{ title: '', minutes: 5 }]);
  const [source, setSource] = useState(seed.source ?? `Método de ${creatorName}`);
  const [eslabon, setEslabon] = useState<Eslabon>(seed.eslabon ?? 'accion');
  const [difficulty, setDifficulty] = useState<Difficulty>('suave');
  const [durationDays, setDurationDays] = useState(7);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState(19);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const validSteps = steps.filter((s) => s.title.trim().length >= 3);
  const minutes = validSteps.reduce((a, s) => a + s.minutes, 0);

  async function save(status: 'draft' | 'published') {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/blueprints', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        momentId: seed.momentId, title, objective, requiredMinutes: Math.max(1, Math.min(240, minutes)), durationDays,
        difficulty, eslabon, steps: validSteps, source, tier, priceCents: tier === 'premium' ? Math.round(price * 100) : 0, status,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(json.message ?? 'No se pudo guardar.'); return; }
    toast(status === 'published' ? 'Blueprint publicado' : 'Borrador guardado');
    router.push(`/blueprints/${json.id}`);
  }

  const ready = title.length >= 3 && objective.length >= 3 && validSteps.length > 0 && source.length >= 2;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save('published'); }} className="flex flex-col gap-3">
      <fieldset className="rounded-[20px] bg-white p-4 shadow-ring">
        <legend className="mb-3 text-xs font-medium text-soi-muted">Objetivo</legend>
        <Label htmlFor="bf-title">Título</Label>
        <Input id="bf-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} placeholder="5 minutos para recuperar momentum" />
        <Label htmlFor="bf-obj" className="mt-3">Resultado esperado</Label>
        <Textarea id="bf-obj" value={objective} onChange={(e) => setObjective(e.target.value)} required minLength={3} maxLength={500} rows={2} />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="bf-esl">Eslabón</Label>
            <Select id="bf-esl" value={eslabon} onChange={(e) => setEslabon(e.target.value as Eslabon)}>
              {(Object.keys(ESLABON_LABEL) as Eslabon[]).map((k) => <option key={k} value={k}>{ESLABON_LABEL[k]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="bf-diff">Intensidad</Label>
            <Select id="bf-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((k) => <option key={k} value={k}>{DIFFICULTY_LABEL[k]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="bf-days">Duración (días)</Label>
            <Input id="bf-days" type="number" min={1} max={365} value={durationDays} onChange={(e) => setDurationDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} className="nums" />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-[20px] bg-white p-4 shadow-ring">
        <legend className="mb-3 text-xs font-medium text-soi-muted">Proceso · <span className="nums">{minutes} min al día</span></legend>
        <ActionListEditor value={steps} onChange={setSteps} max={12} idPrefix="bf-s" />
        <Label htmlFor="bf-src" className="mt-3">Fuente</Label>
        <Input id="bf-src" value={source} onChange={(e) => setSource(e.target.value)} required minLength={2} maxLength={200} />
        <p className="mt-1 text-xs text-soi-muted">Toda rutina en SOI cita su fuente. Si te basas en un autor, nómbralo.</p>
      </fieldset>

      <fieldset className="rounded-[20px] bg-white p-4 shadow-ring">
        <legend className="mb-3 text-xs font-medium text-soi-muted">Acceso</legend>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-soi-sidebar p-1.5" role="radiogroup" aria-label="Tipo de acceso">
          {(['free', 'premium'] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tier === t} onClick={() => setTier(t)}
              className={cn('press h-9 rounded-lg text-sm', tier === t ? 'bg-white text-soi-ink shadow-ring' : 'text-soi-muted')}>
              {t === 'free' ? 'Gratis · genera confianza' : 'Premium · pago único'}
            </button>
          ))}
        </div>
        {tier === 'premium' && (
          <div className="mt-3 flex items-end gap-3">
            <div className="w-32">
              <Label htmlFor="bf-price">Precio (USD)</Label>
              <Input id="bf-price" type="number" min={1} max={500} step={1} value={price} onChange={(e) => setPrice(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} className="nums" />
            </div>
            <p className="nums pb-2 text-sm text-soi-muted">Recibes {formatPrice(Math.floor(price * 100 * CREATOR_REVENUE_SHARE))} por cada implementación ({Math.round(CREATOR_REVENUE_SHARE * 100)}%).</p>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-2 px-1">
        <Button type="button" variant="outline" onClick={() => save('draft')} disabled={busy || !ready}>Guardar borrador</Button>
        <Button type="submit" disabled={busy || !ready}>{busy ? 'Guardando…' : 'Publicar'}</Button>
      </div>
      {msg && <p role="alert" className="px-1 text-sm text-soi-danger">{msg}</p>}
    </form>
  );
}
