'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Search, Upload } from 'lucide-react';
import { Input, Label, Textarea } from '@/components/ui/input';
import { uploadMedia } from '@/lib/media/upload';
import { ExerciseAnimation } from '@/components/library/exercise-animation';
import { cn } from '@/lib/utils';

type Cfg = Record<string, unknown>;
type Props = { id: string; value: Cfg; onChange: (patch: Cfg) => void };

function useDebounced<T>(fn: (q: string) => Promise<T>, q: string, min = 2) {
  const [data, setData] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < min) { setData(null); return; }
    timer.current = setTimeout(() => { void fn(q.trim()).then(setData); }, 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return data;
}

/**
 * Libro: empieza con el buscador (Open Library). Elegido el libro: portada, cambiar, modo
 * (ideas clave o leer páginas) y "Generar resumen" para ver aquí mismo lo que verá quien lo viva.
 */
export function BookField({ id, value, onChange }: Props) {
  const chosen = Boolean(value.key || value.title);
  const [searching, setSearching] = useState(!chosen);
  const [q, setQ] = useState('');
  const results = useDebounced(async (s) => {
    const r = await fetch(`/api/library/books/search?q=${encodeURIComponent(s)}`);
    return ((await r.json().catch(() => ({ books: [] }))).books ?? []) as { key: string; title: string; author: string | null; year: number | null; coverUrl: string | null }[];
  }, q);
  const [summary, setSummary] = useState<{ premise: string; ideas: { title: string; text: string }[] } | null>(null);
  const [sumState, setSumState] = useState<'idle' | 'loading' | 'error'>('idle');
  const mode = (value.mode as string) ?? 'summary';

  async function loadSummary() {
    setSumState('loading');
    const res = await fetch('/api/library/books/summary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: value.key, title: value.title, author: (value.author as string | undefined) ?? null }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) { setSumState('error'); return; }
    setSummary(json.summary); setSumState('idle');
  }

  function pick(b: { key: string; title: string; author: string | null; coverUrl: string | null }) {
    onChange({ title: b.title.slice(0, 300), author: b.author ?? undefined, key: b.key, cover: b.coverUrl ?? undefined });
    setQ(''); setSearching(false); setSummary(null); setSumState('idle');
  }

  return (
    <div className="flex flex-col gap-2">
      {chosen && !searching ? (
        <div className="flex items-center gap-3">
          {value.cover
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value.cover as string} alt="" className="h-16 w-11 shrink-0 rounded-[4px] object-cover shadow-ring" />
            : <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded-[4px] bg-soi-tray text-soi-subtle"><BookOpen className="h-4 w-4" aria-hidden="true" /></span>}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium">{value.title as string}</p>
            {value.author ? <p className="truncate text-xs text-soi-muted">{value.author as string}</p> : null}
          </div>
          <button type="button" onClick={() => setSearching(true)} className="press h-9 shrink-0 rounded-lg px-3 text-sm text-soi-accent hover:bg-black/[0.04]">Cambiar</button>
        </div>
      ) : (
        <>
          <Label htmlFor={id} className="text-xs text-soi-muted">Busca el libro</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soi-subtle" aria-hidden="true" />
            <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título o autor" className="pl-9" autoFocus={!chosen} />
          </div>
          {results && (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg bg-soi-sidebar p-1" aria-label="Resultados">
              {results.length ? results.map((b) => (
                <li key={b.key}>
                  <button type="button" onClick={() => pick(b)} className="press flex w-full items-center gap-2 rounded-md bg-white p-1.5 text-left text-sm shadow-ring">
                    {b.coverUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={b.coverUrl} alt="" className="h-12 w-8 shrink-0 rounded-[3px] object-cover" />
                      : <span className="h-12 w-8 shrink-0 rounded-[3px] bg-soi-tray" />}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block">{b.title}</span>
                      <span className="block truncate text-xs text-soi-muted">{[b.author, b.year].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                </li>
              )) : <li className="p-2 text-sm text-soi-muted">Sin resultados. Prueba con el título en otro idioma o el autor.</li>}
            </ul>
          )}
          {chosen && <button type="button" onClick={() => setSearching(false)} className="press w-fit text-xs text-soi-muted">Mantener «{String(value.title)}»</button>}
        </>
      )}

      {chosen && !searching && (
        <>
          <div role="radiogroup" aria-label="Qué hacer con el libro" className="grid grid-cols-2 gap-1 rounded-lg bg-soi-sidebar p-1">
            {([['summary', 'Ideas clave'], ['read', 'Leer páginas']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => onChange({ mode: v })}
                className={cn('press h-8 rounded-md text-sm', mode === v ? 'bg-white font-medium shadow-ring' : 'text-soi-muted')}>{l}</button>
            ))}
          </div>
          {mode === 'read' ? (
            <div className="w-28">
              <Label htmlFor={`${id}-pages`} className="text-xs text-soi-muted">Páginas</Label>
              <Input id={`${id}-pages`} type="number" min={1} max={200} value={Number(value.pages ?? 10)} className="nums"
                onChange={(e) => onChange({ pages: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} />
            </div>
          ) : value.key ? (
            summary ? (
              <div className="rounded-lg bg-soi-sidebar p-3 text-sm">
                <p className="text-soi-ink">{summary.premise}</p>
                <ol className="mt-2 flex flex-col gap-1">
                  {summary.ideas.map((idea, n) => <li key={n}><span className="nums mr-1 text-soi-accent">{n + 1}.</span><span className="font-medium">{idea.title}</span></li>)}
                </ol>
                <p className="mt-2 text-xs text-soi-muted">Así lo verá quien viva el Moment, con una práctica para aplicarlo.</p>
              </div>
            ) : (
              <button type="button" onClick={loadSummary} disabled={sumState === 'loading'}
                className="press inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-3 text-sm shadow-ring disabled:opacity-60">
                {sumState === 'loading' ? 'Generando resumen…' : sumState === 'error' ? 'No se pudo. Reintentar' : 'Generar resumen'}
              </button>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

/** Documento: un PDF de mi biblioteca (privado) o uno subido para este Moment (se puede publicar). */
export function DocumentField({ id, value, onChange }: Props) {
  const [items, setItems] = useState<{ id: string; title: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch('/api/library/items?kind=pdf').then((r) => r.json()).then((j) => setItems(j.items ?? [])).catch(() => setItems([]));
  }, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf') { setMsg('Solo PDF.'); return; }
    if (file.size > 25 * 1024 * 1024) { setMsg('Máximo 25 MB.'); return; }
    setBusy(true); setMsg(null);
    try {
      const { path } = await uploadMedia('moment-assets', file, 'docs');
      onChange({ assetPath: path, itemId: undefined, title: (typeof value.title === 'string' && value.title && value.title !== 'Documento' ? value.title : file.name.replace(/\.pdf$/i, '')).slice(0, 200) });
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  const selected = value.itemId ? `item:${value.itemId}` : value.assetPath ? 'asset' : '';
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-xs text-soi-muted">PDF</Label>
      <select id={id} value={selected} onChange={(e) => {
        const v = e.target.value;
        if (v.startsWith('item:')) {
          const it = items?.find((x) => x.id === v.slice(5));
          onChange({ itemId: v.slice(5), assetPath: undefined, title: (it?.title ?? 'Documento').slice(0, 200) });
        }
      }} className="h-11 rounded-lg bg-white px-3 text-[15px] shadow-ring">
        <option value="" disabled>{items === null ? 'Cargando tu biblioteca…' : 'Elige un PDF de tu biblioteca'}</option>
        {value.assetPath ? <option value="asset">Subido para este Moment: {String(value.title)}</option> : null}
        {(items ?? []).map((it) => <option key={it.id} value={`item:${it.id}`}>{it.title}</option>)}
      </select>
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className="press inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-3 text-sm shadow-ring disabled:opacity-60">
        <Upload className="h-4 w-4" aria-hidden="true" /> {busy ? 'Subiendo…' : 'Subir un PDF para este Moment'}
      </button>
      <input ref={input} type="file" accept="application/pdf" className="sr-only" aria-label="Subir PDF" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
      <p className="text-xs text-soi-muted">Los PDF de tu biblioteca son privados. Si publicas el Moment, SOI guarda una copia para que otras personas puedan abrirlo.</p>
      {msg && <p role="alert" className="text-xs text-soi-danger">{msg}</p>}
      <Label htmlFor={`${id}-title`} className="text-xs text-soi-muted">Título</Label>
      <Input id={`${id}-title`} value={String(value.title ?? '')} maxLength={200} onChange={(e) => onChange({ title: e.target.value })} />
      <Label htmlFor={`${id}-prompt`} className="text-xs text-soi-muted">Qué buscar al leerlo (opcional)</Label>
      <Textarea id={`${id}-prompt`} rows={2} value={String(value.prompt ?? '')} maxLength={300} onChange={(e) => onChange({ prompt: e.target.value || undefined })} />
    </div>
  );
}

type ExerciseItem = { id: string; name: string; kind: string; muscles: string[]; frames: string[] };

/** Ejercicio: búsqueda con animación + series, repeticiones o segundos y descanso. */
export function ExerciseField({ id, value, onChange }: Props) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'calistenia' | 'gimnasio' | 'estiramiento'>('calistenia');
  const [list, setList] = useState<ExerciseItem[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/library/exercises?tipo=${kind}&q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((j) => setList((j.exercises ?? []).slice(0, 12))).catch(() => setList([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, kind]);
  const byTime = value.seconds !== undefined;
  const num = (k: string, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: Math.max(min, Math.min(max, Number(e.target.value) || min)) });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {Array.isArray(value.frames) && value.frames.length
          ? <ExerciseAnimation frames={value.frames as string[]} name={String(value.name)} className="h-16 w-16 shrink-0 rounded-lg shadow-ring" />
          : <span className="h-16 w-16 shrink-0 rounded-lg bg-soi-tray" />}
        <Input aria-label="Nombre del ejercicio" value={String(value.name ?? '')} maxLength={120} onChange={(e) => onChange({ name: e.target.value })} className="flex-1" />
      </div>
      <div role="tablist" aria-label="Tipo" className="grid grid-cols-3 gap-1 rounded-lg bg-soi-sidebar p-1">
        {(['calistenia', 'gimnasio', 'estiramiento'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={cn('press h-8 rounded-md text-xs capitalize', kind === k ? 'bg-white font-medium shadow-ring' : 'text-soi-muted')}>{k}</button>
        ))}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soi-subtle" aria-hidden="true" />
        <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pecho, glúteos, push up…" className="pl-9" aria-label="Buscar ejercicio" />
      </div>
      <ul className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto rounded-lg bg-soi-sidebar p-1.5">
        {(list ?? []).map((e) => (
          <li key={e.id}>
            <button type="button" aria-pressed={value.exerciseId === e.id} onClick={() => onChange({ exerciseId: e.id, frames: e.frames.slice(0, 2), name: e.name.slice(0, 120), query: undefined })}
              className={cn('press block w-full rounded-md bg-white p-1 text-left shadow-ring', value.exerciseId === e.id && 'shadow-[0_0_0_2px_var(--color-soi-accent)]')}>
              <ExerciseAnimation frames={e.frames} name={e.name} className="aspect-square rounded" />
              <span className="mt-1 line-clamp-2 block text-[11px] leading-tight">{e.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-2">
        <div><Label htmlFor={`${id}-sets`} className="text-xs text-soi-muted">Series</Label><Input id={`${id}-sets`} type="number" min={1} max={10} value={Number(value.sets ?? 3)} onChange={num('sets', 1, 10)} className="nums" /></div>
        {byTime
          ? <div><Label htmlFor={`${id}-sec`} className="text-xs text-soi-muted">Segundos</Label><Input id={`${id}-sec`} type="number" min={5} max={300} value={Number(value.seconds)} onChange={num('seconds', 5, 300)} className="nums" /></div>
          : <div><Label htmlFor={`${id}-reps`} className="text-xs text-soi-muted">Repeticiones</Label><Input id={`${id}-reps`} type="number" min={1} max={100} value={Number(value.reps ?? 10)} onChange={num('reps', 1, 100)} className="nums" /></div>}
        <div><Label htmlFor={`${id}-rest`} className="text-xs text-soi-muted">Descanso (s)</Label><Input id={`${id}-rest`} type="number" min={0} max={180} value={Number(value.rest ?? 30)} onChange={num('rest', 0, 180)} className="nums" /></div>
      </div>
      <button type="button" onClick={() => onChange(byTime ? { seconds: undefined, reps: 10 } : { seconds: 30, reps: undefined })} className="press w-fit text-xs text-soi-accent">
        {byTime ? 'Contar repeticiones' : 'Sostener por segundos (plancha, estiramiento)'}
      </button>
    </div>
  );
}
