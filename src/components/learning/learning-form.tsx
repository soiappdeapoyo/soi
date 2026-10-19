'use client';

import { useState } from 'react';
import { LEARNING_QUESTIONS, SOURCE_KINDS, SOURCE_LABEL, type LearningInputT, type SourceKind } from '@/lib/learning';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HINT: Record<keyof typeof LEARNING_QUESTIONS, string> = {
  learned: 'La idea, con tus palabras.',
  meaning: 'Por qué te importa, en tu vida de hoy.',
  action: 'Una sola cosa, pequeña y concreta.',
  measure: 'Algo que puedas notar: «terminé la tarea antes de las 10».',
};

/**
 * Las 4 preguntas que convierten información en comportamiento. Solo la primera es obligatoria; con acción,
 * SOI vuelve en unos días a preguntar si funcionó. `source` fijo (un video) oculta qué fue.
 */
export function LearningForm({ source: fixedSource, initialSource, kind: fixedKind, onSubmit, submitLabel = 'Guardar', compact = false, autoFocus = false }: {
  source?: string;
  /** Para empezar con un título (editable), p. ej. un libro de su biblioteca. */
  initialSource?: string;
  kind?: SourceKind;
  onSubmit: (input: LearningInputT) => Promise<string | null>;
  submitLabel?: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [source, setSource] = useState(fixedSource ?? initialSource ?? '');
  const [kind, setKind] = useState<SourceKind>(fixedKind ?? 'libro');
  const [f, setF] = useState({ learned: '', meaning: '', action: '', measure: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const input: LearningInputT = {
      source: source.trim(), kind, learned: f.learned.trim(),
      ...(f.meaning.trim() ? { meaning: f.meaning.trim() } : {}),
      ...(f.action.trim() ? { action: f.action.trim() } : {}),
      ...(f.measure.trim() ? { measure: f.measure.trim() } : {}),
    };
    const err = await onSubmit(input);
    setBusy(false);
    if (err) setMsg(err);
  }

  const field = (k: keyof typeof LEARNING_QUESTIONS, i: number) => (
    <label key={k} className="block">
      <span className={cn('font-medium', compact ? 'text-[15px]' : 'text-[17px]')}><span className="nums text-soi-accent">{i + 1}.</span> {LEARNING_QUESTIONS[k]}{k !== 'learned' && <span className="text-sm font-normal text-soi-muted"> (opcional)</span>}</span>
      {!compact && <span className="block text-sm text-soi-muted">{HINT[k]}</span>}
      <textarea value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value.slice(0, k === 'action' || k === 'measure' ? 200 : 600) }))}
        rows={k === 'learned' || k === 'meaning' ? 3 : 2} autoFocus={autoFocus && i === 0}
        className="mt-1.5 w-full resize-none rounded-[14px] bg-soi-canvas p-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {fixedSource === undefined && (
        <>
          <div role="group" aria-label="De dónde viene" className="flex flex-wrap gap-1.5">
            {SOURCE_KINDS.filter((k) => k !== 'conversacion').map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                className={cn('press rounded-full px-3 py-1.5 text-sm', kind === k ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:bg-soi-tray')}>
                {SOURCE_LABEL[k]}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="text-[17px] font-medium">¿Cuál?</span>
            <input value={source} onChange={(e) => setSource(e.target.value.slice(0, 200))} placeholder="Título y autor, por ejemplo: «Hábitos atómicos», James Clear"
              className="mt-1.5 h-11 w-full rounded-[12px] bg-soi-canvas px-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
          </label>
        </>
      )}
      {(['learned', 'meaning', 'action', 'measure'] as const).map(field)}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || f.learned.trim().length < 3 || source.trim().length < 2} className={buttonClass('primary', compact ? 'sm' : 'md')}>
          {busy ? 'Guardando…' : submitLabel}
        </button>
        {f.action.trim() && <span className="text-sm text-soi-muted">En 3 días te pregunto si funcionó.</span>}
      </div>
      {msg && <p role="alert" className="text-sm text-soi-danger">{msg}</p>}
    </form>
  );
}
