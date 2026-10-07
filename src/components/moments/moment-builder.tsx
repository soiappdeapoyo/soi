'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, GripVertical, Plus, X } from 'lucide-react';
import { compressImage, uploadMedia } from '@/lib/media/upload';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { ACTIONS, ACTION_TYPES, MOMENT_KINDS, defaultBlock, exerciseSeconds, type ActionBlock, type ActionType, type MomentKind, BREATH_PATTERNS, type BreathPattern } from '@/config/actions';
import { CREATOR_REVENUE_SHARE, formatPrice } from '@/config/creators';
import { cn } from '@/lib/utils';
import { AudioField, ImageField, QuizEditor, YoutubeField } from './builder-fields';
import { BookField, DocumentField, ExerciseField } from './builder-library-fields';
import { GuidedField } from './guided-field';

type Field = { key: string; label: string; kind: 'text' | 'textarea' | 'number' | 'lines' | 'select' | 'time' | 'audio' | 'quiz' | 'book' | 'document' | 'exercise' | 'image' | 'youtube'; options?: { value: string; label: string }[]; min?: number; max?: number };

const FIELDS: Record<ActionType, Field[]> = {
  breathing: [
    { key: 'pattern', label: 'Patrón', kind: 'select', options: [{ value: '', label: 'Personalizado' }, ...(Object.entries(BREATH_PATTERNS) as [string, { label: string }][]).map(([value, p]) => ({ value, label: p.label }))] },
    { key: 'inhale', label: 'Inhalar (s)', kind: 'number', min: 2, max: 8 }, { key: 'hold', label: 'Sostener (s)', kind: 'number', min: 0, max: 8 },
    { key: 'exhale', label: 'Exhalar (s)', kind: 'number', min: 2, max: 10 }, { key: 'holdOut', label: 'Pausa al final (s)', kind: 'number', min: 0, max: 8 },
  ],
  reframe: [{ key: 'thought', label: 'Pensamiento a trabajar (opcional: si lo dejas vacío, la persona escribe el suyo)', kind: 'textarea' }],
  body_scan: [{ key: 'areas', label: 'Zonas del cuerpo (una por línea)', kind: 'lines' }, { key: 'secondsEach', label: 'Segundos por zona', kind: 'number', min: 10, max: 60 }],
  letter: [{ key: 'to', label: 'Para quién', kind: 'text' }, { key: 'prompt', label: 'Indicación', kind: 'textarea' }],
  meditation: [{ key: 'guide', label: 'Guion de la meditación (la voz lo lee completo)', kind: 'textarea' }],
  timer: [{ key: 'instruction', label: 'Instrucción', kind: 'textarea' }],
  writing: [{ key: 'prompt', label: 'Pregunta para escribir', kind: 'text' }],
  visualization: [{ key: 'scene', label: 'Escena', kind: 'textarea' }],
  checklist: [{ key: 'items', label: 'Pasos (uno por línea)', kind: 'lines' }],
  video: [{ key: 'videoId', label: 'Link de YouTube', kind: 'youtube' }, { key: 'query', label: 'O qué video buscar (autor y tema)', kind: 'text' }],
  image: [{ key: 'path', label: 'Imagen', kind: 'image' }, { key: 'caption', label: 'Texto que acompaña la imagen (opcional)', kind: 'textarea' }],
  walk: [{ key: 'instruction', label: 'Instrucción', kind: 'text' }],
  gratitude: [{ key: 'count', label: 'Cuántas cosas', kind: 'number', min: 1, max: 5 }],
  reading: [{ key: 'book', label: 'Libro', kind: 'text' }, { key: 'pages', label: 'Páginas', kind: 'number', min: 1, max: 100 }],
  reflection: [{ key: 'question', label: 'Pregunta', kind: 'text' }],
  affirmation: [{ key: 'text', label: 'Afirmación principal', kind: 'text' }, { key: 'items', label: 'Afirmaciones (una por línea)', kind: 'lines' }, { key: 'repeat', label: 'Repeticiones', kind: 'number', min: 1, max: 10 }],
  goal: [{ key: 'prompt', label: 'Pregunta', kind: 'text' }],
  emotion_log: [{ key: 'question', label: 'Pregunta', kind: 'text' }],
  rest: [{ key: 'instruction', label: 'Instrucción', kind: 'text' }, { key: 'variant', label: 'Tipo', kind: 'select', options: [{ value: 'rest', label: 'Descanso' }, { value: 'stretching', label: 'Estiramiento' }] }],
  celebration: [{ key: 'message', label: 'Mensaje', kind: 'text' }],
  next_step: [{ key: 'instruction', label: 'Instrucción', kind: 'text' }],
  manifestation: [{ key: 'desire', label: 'Qué manifestar', kind: 'text' }, { key: 'assumption', label: 'Asunción (en presente)', kind: 'text' }, { key: 'scene', label: 'Escena del deseo cumplido', kind: 'textarea' }, { key: 'feeling', label: 'Cómo se siente', kind: 'text' }, { key: 'action', label: 'Paso de hoy', kind: 'text' }],
  book: [{ key: 'book', label: 'Libro', kind: 'book' }],
  document: [{ key: 'document', label: 'Documento', kind: 'document' }],
  exercise: [{ key: 'exercise', label: 'Ejercicio', kind: 'exercise' }],
  canvas: [{ key: 'prompt', label: 'Qué dibujar', kind: 'text' }],
  mind_map: [{ key: 'center', label: 'Idea central', kind: 'text' }, { key: 'branches', label: 'Ramas', kind: 'number', min: 2, max: 8 }],
  quiz: [{ key: 'questions', label: 'Preguntas', kind: 'quiz' }],
  music: [{ key: 'query', label: 'Qué música buscar (o sube un audio)', kind: 'text' }, { key: 'audioUrl', label: 'Audio propio (opcional)', kind: 'audio' }],
  audio: [{ key: 'mode', label: 'Modo', kind: 'select', options: [{ value: 'record', label: 'La persona se graba' }, { value: 'listen', label: 'Escuchar un audio' }] }, { key: 'prompt', label: 'Indicación', kind: 'text' }, { key: 'audioUrl', label: 'Audio para escuchar', kind: 'audio' }],
  photo: [{ key: 'prompt', label: 'Qué fotografiar', kind: 'text' }],
  agenda: [{ key: 'prompt', label: 'Pregunta', kind: 'text' }, { key: 'defaultTime', label: 'Hora sugerida', kind: 'time' }],
  pomodoro: [{ key: 'focus', label: 'Foco (min)', kind: 'number', min: 5, max: 60 }, { key: 'rest', label: 'Descanso (min)', kind: 'number', min: 1, max: 30 }, { key: 'cycles', label: 'Ciclos', kind: 'number', min: 1, max: 4 }],
  contract: [{ key: 'commitment', label: 'Compromiso', kind: 'textarea' }, { key: 'consequence', label: 'Si no lo cumplo… (opcional)', kind: 'text' }],
  weekly_review: [{ key: 'focus', label: 'Enfoque (opcional)', kind: 'text' }],
  tracking: [{ key: 'metric', label: 'Qué medir', kind: 'text' }, { key: 'unit', label: 'Unidad', kind: 'text' }, { key: 'target', label: 'Meta (opcional)', kind: 'number', min: 0, max: 100000 }],
  stretching: [{ key: 'sequence', label: 'Estiramientos (uno por línea)', kind: 'lines' }, { key: 'secondsEach', label: 'Segundos cada uno', kind: 'number', min: 15, max: 180 }],
  moment: [],
};

type QuizQ = { q: string; options: string[]; answer: number; explain?: string };

export type BuilderMoment = { id?: string; title: string; objective: string; kind: MomentKind; source: string; blocks: ActionBlock[]; durationDays?: number; cover?: string | null };
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
  const [durationDays, setDurationDays] = useState(initial?.durationDays && initial.durationDays > 1 ? initial.durationDays : 7);
  const [publish, setPublish] = useState(false);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState(9);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Portada: undefined = sin cambios · null = quitar · string = ruta nueva en moment-assets.
  const [coverPath, setCoverPath] = useState<string | null | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover ?? null);
  const [uploading, setUploading] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const [initialSnapshot] = useState(() => JSON.stringify([initial?.title ?? '', initial?.objective ?? '', initial?.kind ?? 'growth', initial?.blocks ?? []]));
  const dirty = coverPath !== undefined || JSON.stringify([title, objective, kind, blocks]) !== initialSnapshot;

  async function pickCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file, 1600, 0.82);
      const { path, publicUrl } = await uploadMedia('moment-assets', blob, 'cover');
      setCoverPath(path); setCoverPreview(publicUrl);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir la portada.');
    } finally {
      setUploading(false);
    }
  }

  function cancel() {
    if (dirty && !window.confirm('¿Salir sin guardar? Perderás los cambios.')) return;
    if (initial?.id) router.push(`/m/${initial.id}`); else router.back();
  }

  const minutes = useMemo(() => blocks.reduce((a, b) => a + (b.seconds ? b.seconds / 60 : b.minutes), 0), [blocks]);
  const set = (i: number, patch: Partial<ActionBlock>) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  // Pomodoro y estiramiento: la duración del bloque se deriva de su configuración.
  const setCfg = (i: number, key: string, value: unknown) => patchCfg(i, { [key]: value });
  const patchCfg = (i: number, patchIn: Record<string, unknown>) => setBlocks((bs) => bs.map((b, j) => {
    let patch = patchIn;
    if (j !== i) return b;
    // Respiración: elegir un patrón rellena sus tiempos; tocar un tiempo vuelve a "Personalizado".
    if (b.type === 'breathing') {
      const pat = patch.pattern as BreathPattern | '' | undefined;
      if (pat !== undefined) patch = pat ? { pattern: pat, ...BREATH_PATTERNS[pat].timing } : { pattern: undefined };
      else if (['inhale', 'hold', 'exhale', 'holdOut'].some((k) => k in patch)) patch = { ...patch, pattern: undefined };
    }
    const config = Object.fromEntries(Object.entries({ ...b.config, ...patch }).filter(([, v]) => v !== undefined));
    if (b.type === 'exercise') {
      const secs = exerciseSeconds(config as { sets?: number; reps?: number; seconds?: number; rest?: number });
      const title = patch.name && (b.title === ACTIONS.exercise.label || b.title === b.config.name) ? String(patch.name) : b.title;
      return { ...b, title, config, minutes: Math.max(1, Math.round(secs / 60)), seconds: secs };
    }
    if (b.type === 'book' && patch.title && (b.title === ACTIONS.book.label || b.title === b.config.title)) return { ...b, title: String(patch.title).slice(0, 120), config };
    if (b.type === 'document' && patch.title && (b.title === ACTIONS.document.label || b.title === b.config.title)) return { ...b, title: String(patch.title).slice(0, 120), config };
    if (b.type === 'pomodoro') {
      const c = config as { focus: number; rest: number; cycles: number };
      return { ...b, config, minutes: c.focus * c.cycles + c.rest * Math.max(0, c.cycles - 1), seconds: undefined };
    }
    if (b.type === 'stretching') {
      const c = config as { sequence: string[]; secondsEach: number };
      return { ...b, config, minutes: Math.max(1, Math.round((c.sequence.length * c.secondsEach) / 60)), seconds: c.sequence.length * c.secondsEach };
    }
    return { ...b, config };
  }));
  const move = (i: number, d: -1 | 1) => setBlocks((bs) => {
    const n = [...bs]; const j = i + d;
    if (j < 0 || j >= n.length) return bs;
    [n[i], n[j]] = [n[j]!, n[i]!];
    return n;
  });

  // Arrastrar para reordenar: puntero con umbral (no roba clics), táctil con pausa (no roba el scroll) y teclado.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((bs) => arrayMove(bs, bs.findIndex((b) => b.id === active.id), bs.findIndex((b) => b.id === over.id)));
  }

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
    const payload = { title, objective, kind, source, blocks, status, durationDays, tier: status === 'published' ? tier : 'free', priceCents: status === 'published' && tier === 'premium' ? Math.round(price * 100) : 0 };
    const res = initial?.id
      ? await fetch(`/api/moments-flow/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, objective, kind, blocks, status, ...(kind === 'challenge' ? { durationDays } : {}) }) })
      : await fetch('/api/moments-flow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || json.ok === false) { setMsg(json.message ?? 'No se pudo guardar.'); return; }
    const savedId = (initial?.id ?? json.id) as string;
    if (coverPath !== undefined) {
      const c = await fetch(`/api/moments-flow/${savedId}/cover`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: coverPath }) });
      const cj = await c.json().catch(() => ({}));
      if (!c.ok || !cj.ok) toast.error(`El Moment se guardó, pero no la portada. ${cj.message ?? 'Intenta cambiarla de nuevo.'}`, { duration: 9000 });
    }
    toast(status === 'published' ? 'Moment publicado' : 'Moment guardado');
    router.push(`/m/${savedId}`);
  }

  const ready = title.trim().length >= 3 && objective.trim().length >= 3 && source.trim().length >= 2 && blocks.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-10 -mx-5 flex items-center justify-between bg-soi-canvas/95 px-3 py-1.5 shadow-[0_1px_0_rgb(11_11_11/0.06)] backdrop-blur md:top-0">
        <Button size="sm" variant="ghost" onClick={cancel} disabled={busy}>Cancelar</Button>
        <span className="text-sm font-medium">{initial?.id ? 'Editar Moment' : 'Nuevo Moment'}</span>
        <Button size="sm" onClick={save} disabled={busy || !ready || uploading}>{busy ? 'Guardando…' : 'Guardar'}</Button>
      </div>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{initial?.id ? 'Editar Moment' : 'Crear Moment'}</h1>
        <p className="text-soi-muted">Combina acciones en una experiencia con intención: inicio, final y un cambio concreto.</p>
      </header>
      <section aria-label="Portada" className="overflow-hidden rounded-[20px] bg-white shadow-ring">
        {coverPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Portada del Moment" className="aspect-[16/9] w-full object-cover" />
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button type="button" onClick={() => coverInput.current?.click()} disabled={uploading} className="press h-9 rounded-lg bg-white/90 px-3 text-sm shadow-ring backdrop-blur">{uploading ? 'Subiendo…' : 'Cambiar'}</button>
              <button type="button" onClick={() => { setCoverPath(null); setCoverPreview(null); }} className="press h-9 rounded-lg bg-white/90 px-3 text-sm shadow-ring backdrop-blur">Quitar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => coverInput.current?.click()} disabled={uploading}
            className="press flex aspect-[16/6] w-full flex-col items-center justify-center gap-1 bg-soi-sidebar text-sm text-soi-muted hover:text-soi-ink">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            {uploading ? 'Subiendo…' : 'Agregar portada'}
            <span className="text-xs text-soi-subtle">Te ayuda a reconocer tu Moment de un vistazo</span>
          </button>
        )}
        <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Elegir imagen de portada"
          onChange={(e) => { void pickCover(e.target.files?.[0]); e.target.value = ''; }} />
      </section>

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
        {kind === 'challenge' && (
          <div className="mt-3 flex items-end gap-3">
            <div className="w-28">
              <Label htmlFor="mb-days">Días del reto</Label>
              <Input id="mb-days" type="number" min={2} max={90} value={durationDays} className="nums"
                onChange={(e) => setDurationDays(Math.max(2, Math.min(90, Number(e.target.value) || 2)))} />
            </div>
            <p className="pb-2 text-xs text-soi-muted">Asigna cada acción a un día, o déjala en «Cada día» para que se repita. Avanza un día por día de calendario.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="mb-flow">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 id="mb-flow" className="text-sm font-medium text-soi-muted">El flujo</h2>
          <span className="nums text-sm text-soi-muted">{Math.round(minutes)} min · {blocks.length} acciones</span>
        </div>
        {blocks.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
            {blocks.map((b, i) => (
              <SortableRow key={b.id} id={b.id} label={`Mover paso ${i + 1}: ${b.title}`}>
                {(handle) => (<>
                <div className="flex items-center gap-2">
                  {handle}
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
                {kind === 'challenge' && (
                  <div className="mt-2 flex items-center gap-2">
                    <label htmlFor={`d-${b.id}`} className="text-xs text-soi-muted">Día</label>
                    <Select id={`d-${b.id}`} value={b.day ? String(b.day) : 'all'} className="w-36"
                      onChange={(e) => set(i, { day: e.target.value === 'all' ? undefined : Number(e.target.value) })}>
                      <option value="all">Cada día</option>
                      {Array.from({ length: durationDays }, (_, d) => <option key={d + 1} value={d + 1}>Día {d + 1}</option>)}
                    </Select>
                  </div>
                )}
                {!isCreator && (b.type === 'meditation' || b.type === 'affirmation' || b.type === 'manifestation') && (
                  <div className="mt-2">
                    <GuidedField kind={b.type === 'affirmation' ? 'affirmations' : b.type} minutes={b.minutes}
                      intention={[title, objective, b.title].filter(Boolean).join('. ')}
                      onApply={(g) => setBlocks((bs) => bs.map((x, j) => (j === i ? { ...x, title: g.title?.slice(0, 120) || x.title, source: g.source?.slice(0, 160) ?? x.source, config: g.config } : x)))} />
                  </div>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {b.type === 'moment' ? (
                    <Select aria-label="Moment a reutilizar" value={(b.config.slug ? `slug:${b.config.slug}` : `id:${b.config.momentId}`) as string}
                      onChange={(e) => {
                        const [k, ref] = e.target.value.split(':');
                        set(i, { config: k === 'slug' ? { slug: ref } : { momentId: ref }, title: nestable.find((o) => o.value === e.target.value)?.label ?? b.title });
                      }} className="sm:col-span-2">
                      {nestable.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : FIELDS[b.type].filter((f) => !(isCreator && b.type === 'video' && f.key === 'query')).map((f) => {
                    const id = `${b.id}-${f.key}`;
                    const v = b.config[f.key];
                    return (
                      <div key={f.key} className={cn(['textarea', 'lines', 'quiz', 'audio', 'book', 'document', 'exercise', 'image', 'youtube'].includes(f.kind) ? 'sm:col-span-2' : '')}>
                        {!['book', 'document', 'exercise'].includes(f.kind) && <Label htmlFor={id} className="text-xs text-soi-muted">{f.label}</Label>}
                        {f.kind === 'textarea' ? <Textarea id={id} rows={2} value={String(v ?? '')} onChange={(e) => setCfg(i, f.key, e.target.value)} />
                          : f.kind === 'lines' ? <Textarea id={id} rows={3} value={((v as string[]) ?? []).join('\n')} onChange={(e) => setCfg(i, f.key, e.target.value.split('\n').slice(0, 10))} />
                          : f.kind === 'number' ? <Input id={id} type="number" min={f.min} max={f.max} value={Number(v ?? f.min ?? 1)} className="nums"
                              onChange={(e) => setCfg(i, f.key, Math.max(f.min ?? 1, Math.min(f.max ?? 100, Number(e.target.value) || (f.min ?? 1))))} />
                          : f.kind === 'select' ? <Select id={id} value={String(v ?? '')} onChange={(e) => setCfg(i, f.key, e.target.value)}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
                          : f.kind === 'time' ? <Input id={id} type="time" value={String(v ?? '07:00')} onChange={(e) => setCfg(i, f.key, e.target.value)} className="nums" />
                          : f.kind === 'audio' ? <AudioField id={id} value={v as string | undefined} onChange={(url) => setCfg(i, f.key, url)} />
                          : f.kind === 'image' ? <ImageField id={id} value={v as string | undefined} onChange={(path) => setCfg(i, f.key, path)} />
                          : f.kind === 'youtube' ? <YoutubeField id={id} videoId={v as string | undefined} onChange={(vid) => patchCfg(i, vid ? { videoId: vid, query: undefined, title: undefined, thumbnail: undefined } : { videoId: undefined })} />
                          : f.kind === 'quiz' ? <QuizEditor value={(v as QuizQ[]) ?? []} onChange={(qs) => setCfg(i, f.key, qs)} />
                          : f.kind === 'book' ? <BookField id={id} value={b.config} onChange={(patch) => patchCfg(i, patch)} noAI={isCreator} />
                          : f.kind === 'document' ? <DocumentField id={id} value={b.config} onChange={(patch) => patchCfg(i, patch)} />
                          : f.kind === 'exercise' ? <ExerciseField id={id} value={b.config} onChange={(patch) => patchCfg(i, patch)} />
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
                </>)}
              </SortableRow>
            ))}
          </ol>
          </SortableContext>
          </DndContext>
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

      <div className="flex gap-2">
        <Button size="lg" variant="outline" onClick={cancel} disabled={busy}>Cancelar</Button>
        <Button size="lg" onClick={save} disabled={busy || !ready || uploading} className="flex-1">{busy ? 'Guardando…' : publish && isCreator ? 'Publicar Moment' : initial?.id ? 'Guardar cambios' : 'Guardar Moment'}</Button>
      </div>
      {msg && <p role="alert" className="text-sm text-soi-danger">{msg}</p>}
    </div>
  );
}

/**
 * Fila arrastrable. Solo el asa inicia el arrastre (los campos siguen siendo editables).
 * Durante el arrastre: elevación con sombra, sin escalar; el resto se desplaza con transform (ease-out fuerte).
 * Con teclado: foco en el asa, espacio para tomar, flechas para mover, espacio para soltar.
 */
function SortableRow({ id, label, children }: { id: string; label: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id, transition: { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  });
  const handle = (
    <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={label}
      className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-soi-subtle hover:text-soi-ink active:cursor-grabbing">
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative rounded-[14px] bg-white p-3 shadow-ring', isDragging && 'z-10 shadow-raised')}>
      {children(handle)}
    </li>
  );
}
