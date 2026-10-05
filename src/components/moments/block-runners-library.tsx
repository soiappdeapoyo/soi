'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ExternalLink, Pause, Play } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { ExerciseAnimation } from '@/components/library/exercise-animation';
import { GuideVideo } from '@/components/media/guide-video';
import { ESLABON_LABEL } from '@/config/agents';
import type { ActionBlock } from '@/config/actions';
import type { BookSummary } from '@/lib/library/ai';
import type { BlockOutput } from './block-runners';
import { cn } from '@/lib/utils';

type P = { block: ActionBlock; output: BlockOutput; setOutput: (o: BlockOutput) => void; say: (t: string) => void; running: boolean };

const lead = 'text-[17px] leading-relaxed text-soi-ink text-pretty';

function DoneButton({ done, onChange, label }: { done: boolean; onChange: (d: boolean) => void; label: string }) {
  return (
    <Button size="sm" variant={done ? 'secondary' : 'outline'} aria-pressed={done} onClick={() => onChange(!done)}>
      {done && <Check className="h-4 w-4 text-soi-accent" aria-hidden="true" />} {label}
    </Button>
  );
}

/** Libro: portada + ideas clave (resumen cacheado) o unas páginas para leer. */
export function BookRunner({ block: b, output, setOutput, say }: P) {
  const c = b.config as { title: string; author?: string; key?: string; cover?: string; mode?: 'summary' | 'read'; pages?: number };
  const [summary, setSummary] = useState<BookSummary | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const spoken = useRef(false);

  useEffect(() => {
    if (c.mode === 'read' || !c.key) return;
    let alive = true;
    setState('loading');
    fetch('/api/library/books/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: c.key, title: c.title, author: c.author ?? null }) })
      .then((r) => r.json()).then((j) => {
        if (!alive) return;
        if (j.ok) { setSummary(j.summary); setState('idle'); } else setState('error');
      }).catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, [c.key, c.title, c.author, c.mode]);

  // Cuando llega el resumen, la voz lee las ideas (una sola vez).
  useEffect(() => {
    if (!summary || spoken.current) return;
    spoken.current = true;
    say(`${summary.premise} ${summary.ideas.map((i, n) => `Idea ${n + 1}: ${i.title}. ${i.text}`).join(' ')} Para practicar hoy: ${summary.practice.title}. ${summary.practice.text}`);
  }, [summary, say]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {c.cover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.cover.replace(/-[SM]\.jpg$/, '-L.jpg')} alt={`Portada de ${c.title}`} className="w-20 shrink-0 rounded-[6px] object-cover shadow-soft" />
          : <span className="flex h-28 w-20 shrink-0 items-center justify-center rounded-[6px] bg-soi-accent-soft text-soi-accent"><BookOpen className="h-6 w-6" aria-hidden="true" /></span>}
        <div className="min-w-0">
          <p className="text-lg font-medium leading-snug">{c.title}</p>
          {c.author && <p className="text-sm text-soi-muted">{c.author}</p>}
          {c.mode === 'read' && c.pages && <p className="nums mt-1 text-sm text-soi-accent">Lee {c.pages} páginas</p>}
        </div>
      </div>
      {c.mode === 'read' ? (
        <DoneButton done={Boolean(output.done)} onChange={(done) => setOutput({ ...output, type: b.type, done })} label="Leído" />
      ) : summary ? (
        <>
          <ol className="flex flex-col gap-1.5">
            {summary.ideas.map((idea, i) => (
              <li key={i} className="rounded-[14px] bg-white p-3 shadow-ring">
                <p className="text-[15px] font-medium"><span className="nums mr-1.5 text-soi-accent">{i + 1}.</span>{idea.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-soi-muted">{idea.text}</p>
              </li>
            ))}
          </ol>
          <p className="rounded-[14px] bg-soi-accent-soft p-3 text-sm"><span className="font-medium">Practícalo hoy · {ESLABON_LABEL[summary.practice.eslabon]}:</span> {summary.practice.text}</p>
        </>
      ) : state === 'loading' ? (
        <div className="skeleton h-40 rounded-[14px]" aria-label="Preparando las ideas clave" />
      ) : (
        <p className={lead}>¿Qué idea de este libro quieres aplicar hoy? Tómate un momento para recordarla.</p>
      )}
    </div>
  );
}

/** Documento: el PDF dentro de SOI (URL pública del Moment o firmada si es de tu biblioteca). */
export function DocumentRunner({ block: b, output, setOutput }: P) {
  const c = b.config as { title: string; itemId?: string; assetPath?: string; prompt?: string };
  const [url, setUrl] = useState<string | null>(c.assetPath ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/moment-assets/${c.assetPath}` : null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (c.assetPath || !c.itemId) return;
    let alive = true;
    fetch(`/api/library/items/${c.itemId}/file?json=1`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!alive) return;
      if (j?.url) setUrl(j.url); else setMissing(true);
    }).catch(() => alive && setMissing(true));
    return () => { alive = false; };
  }, [c.assetPath, c.itemId]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-medium">{c.title}</p>
      {c.prompt && <p className={lead}>{c.prompt}</p>}
      {missing ? (
        <p className="rounded-[14px] bg-soi-sidebar p-3 text-sm text-soi-muted">Este documento es privado de quien creó el Moment. Puedes seguir con el resto.</p>
      ) : url ? (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm', 'w-fit')}><ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir documento</a>
          <iframe src={url} title={c.title} className="hidden h-[50dvh] w-full rounded-[14px] bg-white shadow-ring md:block" />
        </>
      ) : <div className="skeleton h-11 w-40 rounded-lg" />}
      <DoneButton done={Boolean(output.done)} onChange={(done) => setOutput({ ...output, type: b.type, done })} label="Lo leí" />
    </div>
  );
}

/**
 * Ejercicio: animación + series. Por repeticiones se marca cada serie; por segundos corre un cronómetro.
 * Entre series, descanso guiado. Al terminar, una pequeña celebración (recompensa inmediata).
 */
export function ExerciseRunner({ block: b, output, setOutput, say }: P) {
  const c = b.config as { name: string; frames?: string[]; videoId?: string; sets: number; reps?: number; seconds?: number; rest: number };
  const sets = c.sets ?? 3;
  const done = output.count ?? 0;
  const [phase, setPhase] = useState<'work' | 'rest'>('work');
  const [left, setLeft] = useState(0);
  const [holding, setHolding] = useState(false);
  const finished = done >= sets;

  useEffect(() => {
    if (!(phase === 'rest' || holding) || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, holding, left]);

  // Fin del descanso o del tiempo sostenido.
  useEffect(() => {
    if (left > 0) return;
    if (phase === 'rest') { setPhase('work'); say(`Serie ${done + 1}. ${c.seconds ? `Sostén ${c.seconds} segundos.` : `${c.reps ?? 10} repeticiones.`}`); }
    else if (holding) { setHolding(false); completeSet(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  function completeSet() {
    const n = done + 1;
    setOutput({ ...output, type: b.type, count: n, done: n >= sets });
    if (n >= sets) { say(`¡Lo lograste! ${sets} series completas.`); return; }
    if (c.rest > 0) { setPhase('rest'); setLeft(c.rest); say(`Muy bien. Descansa ${c.rest} segundos.`); }
    else say(`Serie ${n + 1}.`);
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {c.frames?.length ? <ExerciseAnimation frames={c.frames} name={c.name} className="aspect-[4/3] w-full max-w-sm rounded-[20px] shadow-ring" />
        : c.videoId ? <GuideVideo id={c.videoId} title={c.name} /> : null}
      <p className="text-lg font-medium">{c.name}</p>
      <ol className="flex gap-1.5" aria-label={`${done} de ${sets} series`}>
        {Array.from({ length: sets }, (_, i) => (
          <li key={i} className={cn('h-2.5 w-8 rounded-full', i < done ? 'bg-soi-accent-fill' : 'bg-soi-tray')} />
        ))}
      </ol>
      {finished ? (
        <p className="animate-pop text-xl font-semibold text-soi-accent" role="status">¡{sets} series completas! Tu cuerpo lo registró.</p>
      ) : phase === 'rest' ? (
        <div role="status">
          <p className="text-sm text-soi-muted">Descanso</p>
          <p className="nums text-4xl font-semibold">{left}s</p>
          <button type="button" onClick={() => setLeft(0)} className="press mt-1 text-sm text-soi-accent">Saltar descanso</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="nums text-sm text-soi-muted">Serie {done + 1} de {sets}</p>
          {c.seconds ? (
            <>
              <p className="nums text-4xl font-semibold" aria-live="polite">{holding ? left : c.seconds}s</p>
              <Button onClick={() => { if (holding) { setHolding(false); } else { setLeft(c.seconds!); setHolding(true); } }}>
                {holding ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />} {holding ? 'Pausa' : 'Empezar'}
              </Button>
            </>
          ) : (
            <>
              <p className="nums text-4xl font-semibold">{c.reps ?? 10} <span className="text-lg font-normal text-soi-muted">repeticiones</span></p>
              <Button onClick={completeSet}><Check className="h-4 w-4" aria-hidden="true" /> Serie hecha</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
