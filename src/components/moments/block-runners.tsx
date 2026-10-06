'use client';

import { useEffect, useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/input';
import { SoiPlayer } from '@/components/media/soi-player';
import { V2Runner } from './block-runners-v2';
import type { VoiceStyle } from '@/config/voices';
import { BookRunner, DocumentRunner, ExerciseRunner } from './block-runners-library';
import type { ActionBlock } from '@/config/actions';
import { cn } from '@/lib/utils';
import { coverUrl } from '@/lib/moments/types';

export type BlockOutput = {
  type?: string;
  text?: string;
  items?: string[];
  checks?: number[];
  mood?: number;
  word?: string;
  count?: number;
  done?: boolean;
  skipped?: boolean;
  /** Ruta privada en run-media (foto, dibujo, audio grabado). */
  media?: string;
  answers?: number[];
  score?: number;
  value?: number;
  date?: string;
  time?: string;
  when?: string;
  signedAt?: string;
  fields?: Record<string, string>;
};

export type RunnerProps = {
  elapsed: number;
  runId: string | null;
  block: ActionBlock;
  output: BlockOutput;
  setOutput: (o: BlockOutput) => void;
  running: boolean;
  /** Avanza al siguiente bloque (lo usan los bloques que terminan solos, como el video). */
  next: () => void;
  say: (text: string) => void;
  /** Indicación breve de la guía (no interrumpe una explicación en curso). */
  cue: (text: string, style?: VoiceStyle) => void;
};

export const MOODS = ['😞', '😕', '😐', '🙂', '😄'] as const;

/** Bloques que avanzan solos cuando se acaba el tiempo. El resto espera a que la persona toque "Siguiente". */
export const AUTO_ADVANCE = new Set(['breathing', 'meditation', 'visualization', 'timer', 'rest', 'pomodoro', 'stretching']);

const lead = 'text-[17px] leading-relaxed text-soi-ink text-pretty';

function cfg<T>(b: ActionBlock) {
  return b.config as T;
}

/** Halo de respiración del ritual (la animación expresiva de SOI). Se detiene en pausa; estático con movimiento reducido. */
function BreathHalo({ running, inhale = 4, exhale = 6, label, onPhase }: { running: boolean; inhale?: number; exhale?: number; label?: string; onPhase?: (p: 'in' | 'out') => void }) {
  const cycle = (inhale + exhale) * 1000;
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const t = setInterval(() => setPhase((Date.now() - start) % cycle < inhale * 1000 ? 'in' : 'out'), 200);
    return () => clearInterval(t);
  }, [running, cycle, inhale]);
  // La guía dice "Inhala… / Exhala…" en cada cambio de fase.
  useEffect(() => {
    if (running) onPhase?.(phase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, running]);
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <span data-breath-halo aria-hidden="true" style={{ animationDuration: `${inhale + exhale}s`, animationPlayState: running ? 'running' : 'paused' }}
        className="absolute inset-3 animate-breathe rounded-full bg-soi-accent-soft" />
      <span className="relative text-xl font-medium" aria-live="polite">{label ?? (running ? (phase === 'in' ? 'Inhala' : 'Exhala') : 'En pausa')}</span>
    </div>
  );
}

export function BlockRunner(p: RunnerProps) {
  const { block: b, output, setOutput } = p;
  switch (b.type) {
    case 'breathing': {
      const c = cfg<{ inhale: number; exhale: number }>(b);
      return <BreathHalo running={p.running} inhale={c.inhale} exhale={c.exhale} onPhase={(ph) => p.cue(ph === 'in' ? 'Inhala…' : 'Exhala…', 'breath')} />;
    }
    case 'meditation': {
      // Guion completo (agente Calma o el creador): la voz lo lee; aquí se puede seguir con la vista.
      const paragraphs = cfg<{ guide: string }>(b).guide.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      return (
        <div className="flex flex-col gap-4">
          <BreathHalo running={p.running} label=" " />
          <div className={cn('max-h-[38dvh] space-y-3 overflow-y-auto text-center', paragraphs.length > 1 && 'text-left')}>
            {paragraphs.map((t, i) => <p key={i} className={lead}>{t}</p>)}
          </div>
        </div>
      );
    }
    case 'visualization':
      return <p className={cn(lead, 'text-center')}>{cfg<{ scene: string }>(b).scene}<br /><span className="text-[15px] text-soi-muted">Cierra los ojos y siéntelo como si ya fuera real.</span></p>;
    case 'timer':
      return <p className={cn(lead, 'text-center')}>{cfg<{ instruction: string }>(b).instruction}</p>;
    case 'rest': {
      const c = cfg<{ instruction: string; variant: 'rest' | 'stretching' }>(b);
      return <p className={cn(lead, 'text-center')}>{c.variant === 'stretching' ? 'Estira: ' : ''}{c.instruction}</p>;
    }
    case 'walk':
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className={lead}>{cfg<{ instruction: string }>(b).instruction}</p>
          <DoneToggle done={Boolean(output.done)} onChange={(done) => setOutput({ ...output, type: b.type, done })} label="Ya volví" />
        </div>
      );
    case 'reading': {
      const c = cfg<{ book: string; pages?: number }>(b);
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className={lead}>{c.book}{c.pages ? <><br /><span className="text-[15px] text-soi-muted">{c.pages} páginas</span></> : null}</p>
          <DoneToggle done={Boolean(output.done)} onChange={(done) => setOutput({ ...output, type: b.type, done })} label="Leído" />
        </div>
      );
    }
    case 'writing':
    case 'reflection':
    case 'goal':
    case 'next_step': {
      const c = b.config as { prompt?: string; question?: string; instruction?: string };
      const prompt = c.prompt ?? c.question ?? c.instruction ?? '';
      return (
        <div className="flex flex-col gap-3">
          <label htmlFor={`b-${b.id}`} className={lead}>{prompt}</label>
          {b.type === 'goal' || b.type === 'next_step'
            ? <Input id={`b-${b.id}`} value={output.text ?? ''} onChange={(e) => setOutput({ ...output, type: b.type, text: e.target.value })} maxLength={200} />
            : <Textarea id={`b-${b.id}`} rows={6} value={output.text ?? ''} onChange={(e) => setOutput({ ...output, type: b.type, text: e.target.value })} maxLength={4000} />}
          {b.type === 'goal' && <p className="text-xs text-soi-muted">Se guardará en tus metas.</p>}
          {b.type === 'next_step' && <p className="text-xs text-soi-muted">Quedará como acción pendiente en Hoy.</p>}
        </div>
      );
    }
    case 'gratitude': {
      const n = cfg<{ count: number }>(b).count;
      const items = output.items ?? Array.from({ length: n }, () => '');
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className={cn(lead, 'mb-2')}>Escribe {n === 1 ? 'una cosa' : `${n} cosas`} por las que agradeces hoy.</legend>
          {items.map((v, i) => (
            <Input key={i} aria-label={`Gratitud ${i + 1}`} value={v} maxLength={160}
              onChange={(e) => { const next = [...items]; next[i] = e.target.value; setOutput({ ...output, type: b.type, items: next }); }} />
          ))}
        </fieldset>
      );
    }
    case 'checklist': {
      const items = cfg<{ items: string[] }>(b).items;
      const checks = new Set(output.checks ?? []);
      return (
        <ul className="flex flex-col gap-1.5">
          {items.map((it, i) => {
            const on = checks.has(i);
            return (
              <li key={i}>
                <button type="button" aria-pressed={on}
                  onClick={() => { const n = new Set(checks); if (on) n.delete(i); else n.add(i); setOutput({ ...output, type: b.type, checks: [...n] }); }}
                  className="press flex w-full items-center gap-3 rounded-[14px] bg-white p-3 text-left shadow-ring">
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md', on ? 'bg-soi-accent text-white' : 'shadow-[inset_0_0_0_1.5px_rgb(11_11_11/0.25)]')}>
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                  <span className={cn('text-[15px]', on && 'text-soi-muted line-through decoration-soi-subtle')}>{it}</span>
                </button>
              </li>
            );
          })}
        </ul>
      );
    }
    case 'affirmation': {
      // Una o varias afirmaciones personales (agente Voz Interior). Se dicen en voz alta, una a una.
      const c = cfg<{ text: string; items?: string[]; repeat: number }>(b);
      const list = c.items?.length ? c.items : [c.text];
      const total = list.length * c.repeat;
      const count = Math.min(output.count ?? 0, total);
      const current = list[count % list.length]!;
      const advance = () => {
        const n = Math.min(total, count + 1);
        setOutput({ ...output, type: b.type, count: n, done: n >= total });
        if (n < total) p.say(list[n % list.length]!);
      };
      return (
        <div className="flex flex-col items-center gap-5 text-center">
          <p key={count} className="animate-step-in text-balance text-2xl font-medium leading-snug">«{count >= total ? list[list.length - 1] : current}»</p>
          <p className="nums text-sm text-soi-muted">Dila en voz alta · {count}/{total}</p>
          <div className="flex gap-2">
            <button type="button" onClick={advance} disabled={count >= total} className="press h-10 rounded-lg bg-soi-ink px-4 text-sm text-white disabled:opacity-40">
              {count >= total ? 'Hecho' : 'La dije'}
            </button>
            <button type="button" onClick={() => p.say(current)} aria-label="Escuchar la afirmación"
              className="press flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-ring"><Volume2 className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          {list.length > 1 && (
            <ol className="w-full max-w-sm space-y-1 text-left text-sm text-soi-muted">
              {list.map((a, i) => <li key={i} className={cn('flex gap-2', i < Math.floor(count / c.repeat) && 'text-soi-subtle line-through')}><span className="nums">{i + 1}.</span>{a}</li>)}
            </ol>
          )}
        </div>
      );
    }
    case 'manifestation': {
      // Agente Asunción (Neville Goddard): qué manifestar, la asunción y la escena del deseo cumplido.
      const c = cfg<{ desire: string; assumption: string; scene: string; feeling?: string; action?: string }>(b);
      return (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-soi-muted">Lo que vas a manifestar</p>
          <p className="-mt-3 text-lg font-medium">{c.desire}</p>
          <p className="text-balance text-2xl font-semibold leading-snug text-soi-accent">«{c.assumption}»</p>
          <div className="rounded-[20px] bg-soi-sidebar p-4 text-left">
            <p className="text-xs font-medium text-soi-muted">Cierra los ojos y vive esta escena, como si ya fuera real</p>
            <p className={cn(lead, 'mt-1')}>{c.scene}</p>
            {c.feeling && <p className="mt-2 text-sm text-soi-muted">Siente: {c.feeling}</p>}
          </div>
          {c.action && <p className="text-sm"><span className="font-medium">Tu paso de hoy:</span> {c.action}</p>}
          <DoneToggle done={Boolean(output.done)} onChange={(done) => setOutput({ ...output, type: b.type, done })} label="Lo sentí real" />
        </div>
      );
    }
    case 'emotion_log': {
      const c = cfg<{ question: string }>(b);
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className={lead}>{c.question}</p>
          <div role="radiogroup" aria-label="Cómo te sientes" className="flex gap-2">
            {MOODS.map((m, i) => (
              <button key={m} type="button" role="radio" aria-checked={output.mood === i + 1} aria-label={`Ánimo ${i + 1} de 5`}
                onClick={() => setOutput({ ...output, type: b.type, mood: i + 1 })}
                className={cn('press-deep flex h-12 w-12 items-center justify-center rounded-full text-2xl', output.mood === i + 1 ? 'bg-soi-accent-soft shadow-[0_0_0_2px_var(--color-soi-accent)]' : 'bg-white shadow-ring')}>{m}</button>
            ))}
          </div>
          <Input aria-label="Una palabra para lo que sientes" placeholder="Una palabra (opcional)" value={output.word ?? ''} maxLength={40}
            onChange={(e) => setOutput({ ...output, type: b.type, word: e.target.value })} className="max-w-xs text-center" />
        </div>
      );
    }
    case 'video': {
      const c = cfg<{ videoId?: string; title?: string; channel?: string; thumbnail?: string }>(b);
      if (!c.videoId) return <p className={cn(lead, 'text-center text-soi-muted')}>Este video no está disponible ahora. Puedes continuar.</p>;
      return <SoiPlayer video={{ id: c.videoId, title: c.title ?? b.title, channel: c.channel ?? '', thumbnail: c.thumbnail ?? '' }}
        onEnded={() => { setOutput({ ...output, type: b.type, done: true }); p.next(); }} />;
    }
    case 'celebration':
      return (
        <div className="relative flex flex-col items-center gap-3 py-6 text-center">
          <span aria-hidden="true" className="absolute top-2 h-24 w-24 animate-celebrate rounded-full shadow-[0_0_0_3px_var(--color-soi-gold)]" />
          <p className="relative text-balance text-2xl font-medium">{cfg<{ message: string }>(b).message}</p>
        </div>
      );
    case 'image': {
      const c = cfg<{ path: string; caption?: string }>(b);
      const src = coverUrl(c.path);
      return (
        <figure className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src && <img src={src} alt={c.caption ?? b.title} className="max-h-[52dvh] w-full rounded-[20px] object-contain shadow-ring" />}
          {c.caption && <figcaption className="whitespace-pre-line text-balance text-center text-[17px] leading-relaxed">{c.caption}</figcaption>}
        </figure>
      );
    }
    case 'book': return <BookRunner block={b} output={output} setOutput={setOutput} say={p.say} running={p.running} />;
    case 'document': return <DocumentRunner block={b} output={output} setOutput={setOutput} say={p.say} running={p.running} />;
    case 'exercise': return <ExerciseRunner block={b} output={output} setOutput={setOutput} say={p.say} running={p.running} />;
    default:
      return <V2Runner block={b} output={output} setOutput={setOutput} next={p.next} running={p.running} elapsed={p.elapsed} runId={p.runId} cue={p.cue} />;
  }
}

function DoneToggle({ done, onChange, label }: { done: boolean; onChange: (d: boolean) => void; label: string }) {
  return (
    <button type="button" aria-pressed={done} onClick={() => onChange(!done)}
      className={cn('press inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm', done ? 'bg-soi-accent-soft text-soi-accent' : 'bg-white shadow-ring')}>
      <Check className="h-4 w-4" aria-hidden="true" /> {done ? 'Hecho' : label}
    </button>
  );
}
