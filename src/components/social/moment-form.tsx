'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { ESLABON_LABEL, type Eslabon } from '@/config/agents';
import { SOURCE_TYPES, TRIGGER_STATES, type SourceType, type TriggerState } from '@/config/creators';
import type { ActionCard } from '@/types/database';
import { ActionListEditor } from './action-list-editor';
import { cn } from '@/lib/utils';

const DEFAULT_QUESTION = '¿Qué idea quieres convertir en parte de tu vida?';

/**
 * Un Moment sigue el ciclo SOI: inspiración → insight → reflexión → acción.
 * Una sola pregunta poderosa, no un cuestionario.
 */
export function MomentForm({ canShare }: { canShare: boolean }) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>('personal_experience');
  const [sourceReference, setSourceReference] = useState('');
  const [title, setTitle] = useState('');
  const [insight, setInsight] = useState('');
  const [reflection, setReflection] = useState('');
  const [category, setCategory] = useState<Eslabon>('accion');
  const [states, setStates] = useState<TriggerState[]>([]);
  const [actions, setActions] = useState<ActionCard[]>([{ title: '', minutes: 10 }]);
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch('/api/moments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, insight, category, triggerState: states, sourceType,
        sourceReference: sourceReference || undefined, reflectionQuestion: DEFAULT_QUESTION,
        userReflection: reflection || undefined,
        actions: actions.filter((a) => a.title.trim().length >= 3),
        visibility: share ? 'community' : 'private',
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMsg(json.message ?? 'No se pudo guardar.'); return; }
    toast(share ? 'Momento compartido' : 'Momento guardado');
    router.push(`/momentos/${json.id}`);
  }

  const step = 'rounded-[20px] bg-white p-4 shadow-ring';
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <fieldset className={step}>
        <legend className="mb-3 text-xs font-medium text-soi-muted">1 · Inspiración</legend>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div>
            <Label htmlFor="mf-src">Origen</Label>
            <Select id="mf-src" value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)}>
              {Object.entries(SOURCE_TYPES).filter(([k]) => k !== 'ai_generated').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="mf-ref">Referencia {sourceType === 'personal_experience' ? '(opcional)' : ''}</Label>
            <Input id="mf-ref" value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} maxLength={200}
              placeholder={sourceType === 'book' ? 'Napoleon Hill — Piense y hágase rico' : 'Autor y título'} />
          </div>
        </div>
      </fieldset>

      <fieldset className={step}>
        <legend className="mb-3 text-xs font-medium text-soi-muted">2 · Insight</legend>
        <Label htmlFor="mf-title">Título</Label>
        <Input id="mf-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} placeholder="Recuperé el enfoque con 5 minutos al día" />
        <Label htmlFor="mf-insight" className="mt-3">La idea que cambió algo en ti</Label>
        <Textarea id="mf-insight" value={insight} onChange={(e) => setInsight(e.target.value)} required minLength={3} maxLength={1000} rows={3} />
      </fieldset>

      <fieldset className={step}>
        <legend className="mb-3 text-xs font-medium text-soi-muted">3 · Reflexión</legend>
        <Label htmlFor="mf-refl">{DEFAULT_QUESTION}</Label>
        <Textarea id="mf-refl" value={reflection} onChange={(e) => setReflection(e.target.value)} maxLength={2000} rows={3} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="mf-cat">Eslabón</Label>
            <Select id="mf-cat" value={category} onChange={(e) => setCategory(e.target.value as Eslabon)}>
              {(Object.keys(ESLABON_LABEL) as Eslabon[]).map((k) => <option key={k} value={k}>{ESLABON_LABEL[k]}</option>)}
            </Select>
          </div>
          <div role="group" aria-label="Qué estabas viviendo">
            <span className="mb-1 block text-sm font-medium">Qué estabas viviendo</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TRIGGER_STATES) as TriggerState[]).map((k) => {
                const on = states.includes(k);
                return (
                  <button key={k} type="button" aria-pressed={on} disabled={!on && states.length >= 4}
                    onClick={() => setStates((s) => (on ? s.filter((x) => x !== k) : [...s, k]))}
                    className={cn('press h-8 rounded-lg px-2.5 text-xs disabled:opacity-40', on ? 'bg-soi-ink text-white' : 'bg-soi-sidebar text-soi-ink shadow-ring')}>
                    {TRIGGER_STATES[k]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className={step}>
        <legend className="mb-3 text-xs font-medium text-soi-muted">4 · Acción</legend>
        <ActionListEditor value={actions} onChange={setActions} idPrefix="mf-a" />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 px-1">
        <label className={cn('flex items-center gap-2 text-sm', !canShare && 'opacity-50')}>
          <input type="checkbox" checked={share} disabled={!canShare} onChange={(e) => setShare(e.target.checked)} className="h-4 w-4 accent-soi-accent" />
          Compartir con la comunidad {!canShare && '(SOI+)'}
        </label>
        <Button type="submit" className="ml-auto" disabled={saving || title.length < 3 || insight.length < 3}>{saving ? 'Guardando…' : 'Guardar momento'}</Button>
      </div>
      <p className="px-1 text-xs text-soi-muted">Sin ventas, enlaces externos ni consejos médicos. Si viene de un libro o video, cita su autor.</p>
      {msg && <p role="alert" className="px-1 text-sm text-soi-danger">{msg}</p>}
    </form>
  );
}
