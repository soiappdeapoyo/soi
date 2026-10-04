'use client';

import { useState } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { uploadMedia } from '@/lib/media/upload';
import { cn } from '@/lib/utils';

type QuizQ = { q: string; options: string[]; answer: number; explain?: string };

/** Sube un audio del creador (bucket público moment-assets) y guarda su URL en el bloque. */
export function AudioField({ id, value, onChange }: { id: string; value?: string; onChange: (url: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setMsg('Máximo 25 MB.'); return; }
    setBusy(true); setMsg(null);
    try {
      const { publicUrl } = await uploadMedia('moment-assets', file, 'audio');
      onChange(publicUrl ?? undefined);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-2">
      {value && (
        <div className="flex items-center gap-2">
          <audio controls src={value} className="h-9 flex-1" preload="none" />
          <button type="button" onClick={() => onChange(undefined)} aria-label="Quitar audio" className="press flex h-9 w-9 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      )}
      <label htmlFor={id} className={cn('press inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm shadow-ring', busy && 'opacity-60')}>
        <Upload className="h-4 w-4" aria-hidden="true" /> {busy ? 'Subiendo…' : value ? 'Cambiar audio' : 'Subir audio'}
      </label>
      <input id={id} type="file" accept="audio/*" className="sr-only" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
      {msg && <p role="alert" className="text-xs text-soi-danger">{msg}</p>}
    </div>
  );
}

/** Editor del quiz: preguntas, 2–4 opciones y cuál es la correcta (radio). */
export function QuizEditor({ value, onChange }: { value: QuizQ[]; onChange: (qs: QuizQ[]) => void }) {
  const set = (i: number, patch: Partial<QuizQ>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <div className="flex flex-col gap-3">
      {value.map((q, i) => (
        <fieldset key={i} className="rounded-lg bg-soi-sidebar p-2.5">
          <legend className="sr-only">Pregunta {i + 1}</legend>
          <div className="flex items-center gap-2">
            <Input aria-label={`Pregunta ${i + 1}`} value={q.q} onChange={(e) => set(i, { q: e.target.value })} placeholder="¿Qué quieres preguntar?" className="flex-1" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} disabled={value.length <= 1} aria-label={`Quitar pregunta ${i + 1}`}
              className="press flex h-9 w-9 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] disabled:opacity-30"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          <div role="radiogroup" aria-label="Respuesta correcta" className="mt-2 flex flex-col gap-1.5">
            {q.options.map((o, k) => (
              <div key={k} className="flex items-center gap-2">
                <input type="radio" name={`quiz-${i}`} checked={q.answer === k} onChange={() => set(i, { answer: k })} aria-label={`Opción ${k + 1} es la correcta`} className="h-4 w-4 accent-soi-accent" />
                <Input aria-label={`Opción ${k + 1}`} value={o} onChange={(e) => set(i, { options: q.options.map((x, n) => (n === k ? e.target.value : x)) })} className="flex-1" />
                {q.options.length > 2 && (
                  <button type="button" aria-label={`Quitar opción ${k + 1}`} onClick={() => set(i, { options: q.options.filter((_, n) => n !== k), answer: k === q.answer ? 0 : k < q.answer ? q.answer - 1 : q.answer })}
                    className="press flex h-8 w-8 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                )}
              </div>
            ))}
            {q.options.length < 4 && (
              <button type="button" onClick={() => set(i, { options: [...q.options, ''] })} className="press inline-flex h-8 w-fit items-center gap-1 rounded-lg px-2 text-xs text-soi-accent hover:bg-soi-accent-soft">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Opción
              </button>
            )}
          </div>
          <Input aria-label="Explicación (opcional)" value={q.explain ?? ''} onChange={(e) => set(i, { explain: e.target.value || undefined })} placeholder="Explicación al responder (opcional)" className="mt-2" />
        </fieldset>
      ))}
      {value.length < 10 && (
        <button type="button" onClick={() => onChange([...value, { q: '', options: ['', ''], answer: 0 }])} className="press inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-2 text-sm text-soi-accent hover:bg-soi-accent-soft">
          <Plus className="h-4 w-4" aria-hidden="true" /> Agregar pregunta
        </button>
      )}
    </div>
  );
}
