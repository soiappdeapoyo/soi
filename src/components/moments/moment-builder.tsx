'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { ACTIONS, ACTION_TYPES, MOMENT_KINDS, defaultBlock, type ActionBlock, type ActionType, type MomentKind } from '@/config/actions';
import { CREATOR_REVENUE_SHARE, formatPrice } from '@/config/creators';
import { cn } from '@/lib/utils';

type Field = { key: string; label: string; kind: 'text' | 'textarea' | 'number' | 'lines' | 'select'; options?: { value: string; label: string }[]; min?: number; max?: number };

const FIELDS: Record<ActionType, Field[]> = {
  breathing: [{ key: 'inhale', label: 'Inhalar (s)', kind: 'number', min: 2, max: 8 }, { key: 'exhale', label: 'Exhalar (s)', kind: 'number', min: 2, max: 10 }],
  meditation: [{ key: 'guide', label: 'Guía', kind: 'textarea' }],
  timer: [{ key: 'instruction', label: 'Instrucción', kind: 'textarea' }],
  writing: [{ key: 'prompt', label: 'Pregunta para escribir', kind: 'text' }],
  visualization: [{ key: 'scene', label: 'Escena', kind: 'textarea' }],
  checklist: [{ key: 'items', label: 'Pasos (uno por línea)', kind: 'lines' }],
  video: [{ key: 'query', label: 'Qué video buscar (autor y tema)', kind: 'text' }],
  walk: [{ key: 'instruction', label: 'Instrucción', kind: 'text' }],
  gratitude: [{ key: 'count', label: 'Cuántas cosas', kind: 'number', min: 1, max: 5 }],
  reading: [{ key: 'book', label: 'Libro', kind: 'text' }, { key: 'pages', label: 'Páginas', kind: 'number', min: 1, max: 100 }],
  reflection: [{ key: 'question', label: 'Pregunta', kind: 'text' }],
  affirmation: [{ key: 'text', label: 'Afirmación', kind: 'text' }, { key: 'repeat', label: 'Repeticiones', kind: 'number', min: 1, max: 10 }],
  goal: [{ key: 'prompt', label: 'Pregunta', kind: 'text' }],
  emotion_log: [{ key: 'question', label: 'Pregunta', kind: 'text' }],
  rest: [{ key: 'instruction', label: 'Instrucción', kind: 'text' }, { key: 'variant', label: 'Tipo', kind: 'select', options: [{ value: 'rest', label: 'Descanso' }, { value: 'stretching', label: 'Estiramiento' }] }],
  celebration: [{ key: 'message', label: 'Mensaje', kind: 'text' }],
  next_step: [{ key: 'instruction', label: 'Instrucción', kind: 'text' }],
  moment: [],
};

export type BuilderMoment = { id?: string; title: string; objective: string; kind: MomentKind; source: string; blocks: ActionBlock[] };
type Option = { value: string; label: string };

/**
 * Constructor de SOI Moments: la biblioteca de acciones se combina en un flujo con intención.
 * Reordenar con flechas (sin arrastrar en v1), edición inline, total de minutos siempre visible.
 */
export function MomentBuilder({ initial, nestable, isCreator, creatorName }: { initial: BuilderMoment | null; nestable: Option[]; isCreator: boolean; creatorName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [objective, setObjective] = useState(initial?.objective ?? '');
  const [kind, setKind] = useState<MomentKind>(initial?.kind ?? 'growth');
  const [source, setSource] = useState(initial?.source ?? `Diseñado por ${creatorName}`);
  const [blocks, setBlocks] = useState<ActionBlock[]>(initial?.blocks ?? []);
  const [publish, setPublish] = useState(false);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState(9);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const minutes = useMemo(() => blocks.reduce((a, b) => a + (b.seconds ? b.seconds / 60 : b.minutes), 0), [blocks]);
  const set = (i: number, patch: Partial<ActionBlock>) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const setCfg = (i: number, key: string, value: unknown) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, config: { ...b.config, [key]: value } } : b)));
  const move = (i: number, d: -1 | 1) => setBlocks((bs) => {
    const n = [...bs]; const j = i + d;
    if (j < 0 || j >= n.length) return bs;
    [n[i], n[j]] = [n[j]!, n[i]!];
    return n;
  });

  function add(t: ActionType) {
    const b = defaultBlock(t);
    if (t === 'moment' && nestable[0]) {
      const [kindOf, ref] = nestable[0].value.split(':');
      b.config = kindOf === 'slug' ? { slug: ref } : { momentId: ref };
      b.title = nestable[0].label;
    }
    setBlocks((bs) => [...bs, b]);
  }

  async function save() {
    setBusy(true); setMsg(null);
    const status = publish && isCreator ? 'published' : 'private';
    const payload = { title, objective, kind, source, blocks, status, tier: status === 'published' ? tier : 'free', priceCents: status === 'published' && tier === 'premium' ? Math.round(price * 100) : 0 };
    const res = initial?.id
      ? await fetch(`/api/moments-flow/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, objective, kind, blocks, status }) })
      : await fetch('/api/moments-flow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || json.ok === false) { setMsg(json.message ?? 'No se pudo guardar.'); return; }
    toast(status === 'published' ? 'Moment publicado' : 'Moment guardado');
    router.push(`/m/${initial?.id ?? json.id}`);
  }

  const ready = title.trim().length >= 3 && objective.trim().length >= 3 && source.trim().length >= 2 && blocks.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[20px] bg-white p-4 shadow-ring">
        <Label htmlFor="mb-title">Nombre</Label>
        <Input id="mb-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Sonríe otra vez" />
        <Label htmlFor="mb-obj" className="mt-3">Objetivo (el cambio que busca)</Label>
        <Textarea id="mb-obj" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={500} placeholder="Recuperar energía cuando me siento triste." />
        <p className="mb-1 mt-3 text-sm font-medium">Tipo</p>
        <div role="radiogroup" aria-label="Tipo de Moment" className="flex flex-wrap gap-1.5">
          {(Object.keys(MOMENT_KINDS) as MomentKind[]).filter((k) => k !== 'community').map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} title={MOMENT_KINDS[k].hint}
              className={cn('press h-8 rounded-lg px-2.5 text-xs', kind === k ? 'bg-soi-ink text-white' : 'bg-soi-sidebar text-soi-ink shadow-ring')}>{MOMENT_KINDS[k].label}</button>
          ))}
        </div>
      </section>

      <section aria-labelledby="mb-flow">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 id="mb-flow" className="text-sm font-medium text-soi-muted">El flujo</h2>
          <span className="nums text-sm text-soi-muted">{Math.round(minutes)} min · {blocks.length} acciones</span>
        </div>
        {blocks.length ? (
          <ol className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
            {blocks.map((b, i) => (
              <li key={b.id} className="rounded-[14px] bg-white p-3 shadow-ring">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soi-accent-soft text-soi-accent"><Icon name={ACTIONS[b.type].icon} className="h-4 w-4" /></span>
                  <label htmlFor={`t-${b.id}`} className="sr-only">Título del paso {i + 1}</label>
                  <Input id={`t-${b.id}`} value={b.title} onChange={(e) => set(i, { title: e.target.value })} maxLength={120} className="flex-1" />
                  {b.type !== 'moment' && (
                    <>
                      <label htmlFor={`m-${b.id}`} className="sr-only">Minutos del paso {i + 1}</label>
                      <Input id={`m-${b.id}`} type="number" inputMode="numeric" min={1} max={120} value={b.minutes} className="nums w-16"
                        onChange={(e) => set(i, { minutes: Math.max(1, Math.min(120, Number(e.target.value) || 1)), seconds: undefined })} />
                    </>
                  )}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {b.type === 'moment' ? (
                    <Select aria-label="Moment a reutilizar" value={(b.config.slug ? `slug:${b.config.slug}` : `id:${b.config.momentId}`) as string}
                      onChange={(e) => {
                        const [k, ref] = e.target.value.split(':');
                        set(i, { config: k === 'slug' ? { slug: ref } : { momentId: ref }, title: nestable.find((o) => o.value === e.target.value)?.label ?? b.title });
                      }} className="sm:col-span-2">
                      {nestable.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : FIELDS[b.type].map((f) => {
                    const id = `${b.id}-${f.key}`;
                    const v = b.config[f.key];
                    return (
                      <div key={f.key} className={cn(f.kind === 'textarea' || f.kind === 'lines' ? 'sm:col-span-2' : '')}>
                        <Label htmlFor={id} className="text-xs text-soi-muted">{f.label}</Label>
                        {f.kind === 'textarea' ? <Textarea id={id} rows={2} value={String(v ?? '')} onChange={(e) => setCfg(i, f.key, e.target.value)} />
                          : f.kind === 'lines' ? <Textarea id={id} rows={3} value={((v as string[]) ?? []).join('\n')} onChange={(e) => setCfg(i, f.key, e.target.value.split('\n').slice(0, 10))} />
                          : f.kind === 'number' ? <Input id={id} type="number" min={f.min} max={f.max} value={Number(v ?? f.min ?? 1)} className="nums"
                              onChange={(e) => setCfg(i, f.key, Math.max(f.min ?? 1, Math.min(f.max ?? 100, Number(e.target.value) || (f.min ?? 1))))} />
                          : f.kind === 'select' ? <Select id={id} value={String(v)} onChange={(e) => setCfg(i, f.key, e.target.value)}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
                          : <Input id={id} value={String(v ?? '')} onChange={(e) => setCfg(i, f.key, e.target.value)} />}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir paso ${i + 1}`} className="press flex h-9 w-9 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={`Bajar paso ${i + 1}`} className="press flex h-9 w-9 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))} aria-label={`Quitar paso ${i + 1}`} className="press flex h-9 w-9 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]"><X className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Elige acciones de la biblioteca para construir tu flujo.</p>}
      </section>

      <section aria-labelledby="mb-lib" className="rounded-[20px] bg-white p-4 shadow-ring">
        <h2 id="mb-lib" className="text-sm font-medium">Biblioteca de acciones</h2>
        <ul className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {ACTION_TYPES.filter((t) => t !== 'moment' || nestable.length).map((t) => (
            <li key={t}>
              <button type="button" onClick={() => add(t)} disabled={blocks.length >= 20} title={ACTIONS[t].hint}
                className="press flex w-full items-center gap-2 rounded-lg bg-soi-sidebar px-2.5 py-2 text-left text-sm shadow-ring hover:bg-white disabled:opacity-40">
                <Plus className="h-3.5 w-3.5 shrink-0 text-soi-subtle" aria-hidden="true" />
                <Icon name={ACTIONS[t].icon} className="h-4 w-4 shrink-0 text-soi-accent" />
                <span className="truncate">{ACTIONS[t].label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[20px] bg-white p-4 shadow-ring">
        <Label htmlFor="mb-src">Fuente</Label>
        <Input id="mb-src" value={source} onChange={(e) => setSource(e.target.value)} maxLength={200} />
        <p className="mt-1 text-xs text-soi-muted">Toda técnica en SOI cita su fuente. Si te basas en un autor, nómbralo.</p>
        {isCreator && !initial?.id && (
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-4 w-4 accent-soi-accent" /> Publicar en Impulso
            </label>
            {publish && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-soi-sidebar p-1.5" role="radiogroup" aria-label="Acceso">
                  {(['free', 'premium'] as const).map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={tier === t} onClick={() => setTier(t)}
                      className={cn('press h-9 rounded-lg px-3 text-sm', tier === t ? 'bg-white shadow-ring' : 'text-soi-muted')}>{t === 'free' ? 'Gratis' : 'Premium'}</button>
                  ))}
                </div>
                {tier === 'premium' && (
                  <>
                    <div className="w-24"><Label htmlFor="mb-price">USD</Label><Input id="mb-price" type="number" min={1} max={500} value={price} className="nums" onChange={(e) => setPrice(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} /></div>
                    <p className="nums pb-2 text-xs text-soi-muted">Recibes {formatPrice(Math.floor(price * 100 * CREATOR_REVENUE_SHARE))} ({Math.round(CREATOR_REVENUE_SHARE * 100)}%)</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <Button size="lg" onClick={save} disabled={busy || !ready}>{busy ? 'Guardando…' : publish && isCreator ? 'Publicar Moment' : 'Guardar Moment'}</Button>
      {msg && <p role="alert" className="text-sm text-soi-danger">{msg}</p>}
    </div>
  );
}
