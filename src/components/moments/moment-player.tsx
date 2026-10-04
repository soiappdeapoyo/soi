'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Flame, Pause, Play, Sparkles, Star, Volume2, VolumeX, X } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { UpgradeSheet } from '@/components/paywall/upgrade-sheet';
import { track } from '@/components/providers/analytics';
import { ACTIONS, blockSeconds, type ActionBlock } from '@/config/actions';
import { AUTO_ADVANCE, BlockRunner, MOODS, type BlockOutput } from './block-runners';
import { cn } from '@/lib/utils';

type Props = {
  moment: { id: string; title: string; objective: string; source: string; author: string | null };
  blocks: ActionBlock[];
  locked: boolean;
  ttsAllowed: boolean;
  voice?: string | null;
};

type Phase = 'before' | 'run' | 'after' | 'done';
type StreakInfo = { streak: number; milestone: number | null; used_shield: boolean } | null;
type Proposal = { current: ActionBlock[]; blocks: ActionBlock[]; note: string; byAI: boolean };

function fmt(s: number) {
  const m = Math.floor(Math.max(0, s) / 60);
  return `${m}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
}

/**
 * Reproductor de SOI Moments (generaliza el RitualTimer, DESIGN.md §5).
 * Ánimo antes → una acción a la vez → ánimo después + "¿qué funcionó?" → celebración → mejor versión.
 * - Cambio de paso: sale -4px/120 ms y entra 6px/200 ms (nunca cruzados).
 * - Barra de tiempo LINEAL (es tiempo real). Halo de respiración solo en respiración y meditación.
 * - Una sola celebración al final (800 ms). Las salidas se guardan al pasar de bloque.
 */
export function MomentPlayer({ moment, blocks, locked, ttsAllowed, voice }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('before');
  const [runId, setRunId] = useState<string | null>(null);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [stepPhase, setStepPhase] = useState<'in' | 'out'>('in');
  const [outputs, setOutputs] = useState<Record<string, BlockOutput>>({});
  const [remaining, setRemaining] = useState(blockSeconds(blocks[0] ?? { minutes: 1 }));
  const [running, setRunning] = useState(false);
  const [voiceOn, setVoiceOn] = useState(ttsAllowed);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [learning, setLearning] = useState('');
  const [helped, setHelped] = useState<boolean | null>(null);
  const [streak, setStreak] = useState<StreakInfo>(null);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [improving, setImproving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const outputsRef = useRef(outputs);
  outputsRef.current = outputs;

  const block = blocks[index]!;
  const shownBlock = blocks[shown]!;
  const total = blockSeconds(block);

  const say = useCallback(async (text: string) => {
    if (!voiceOn || !ttsAllowed) return;
    try {
      const { speak } = await import('@/lib/voice/tts');
      await speak(text, { voice: voice ?? undefined });
    } catch { /* TTS opcional */ }
  }, [voiceOn, ttsAllowed, voice]);

  const saveOutputs = useCallback((id: string | null, data: Record<string, BlockOutput>) => {
    if (!id) return;
    fetch(`/api/moment-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outputs: data }) }).catch(() => {});
  }, []);

  const goTo = useCallback((n: number) => {
    saveOutputs(runId, outputsRef.current);
    if (n >= blocks.length) { setRunning(false); setPhase('after'); return; }
    setIndex(n);
    setRemaining(blockSeconds(blocks[n]!));
  }, [blocks, runId, saveOutputs]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  function skip() {
    setOutputs((o) => ({ ...o, [block.id]: { ...o[block.id], type: block.type, skipped: true } }));
    outputsRef.current = { ...outputsRef.current, [block.id]: { ...outputsRef.current[block.id], type: block.type, skipped: true } };
    next();
  }

  // Tiempo real: avanza solo en los bloques temporizados.
  useEffect(() => {
    if (phase !== 'run' || !running) return;
    if (remaining <= 0) {
      if (AUTO_ADVANCE.has(block.type)) next();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, running, remaining, block.type, next]);

  // Transición del paso: primero sale, luego entra.
  useEffect(() => {
    if (index === shown) return;
    setStepPhase('out');
    const t = setTimeout(() => { setShown(index); setStepPhase('in'); }, 120);
    return () => clearTimeout(t);
  }, [index, shown]);

  useEffect(() => {
    if (phase === 'run') void say(block.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  async function start() {
    if (locked) { setSheet(true); return; }
    setBusy(true);
    const res = await fetch('/api/moment-runs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moment: moment.id, moodBefore: moodBefore ?? undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 402) { setSheet(true); return; }
    if (!res.ok) { toast(json.message ?? 'No se pudo empezar.'); return; }
    setRunId(json.id);
    setPhase('run');
    setRunning(true);
    track('moment_started', { moment: moment.id });
  }

  async function complete() {
    if (!runId) return;
    setBusy(true);
    saveOutputs(runId, outputsRef.current);
    const res = await fetch(`/api/moment-runs/${runId}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moodAfter: moodAfter ?? undefined, learning: learning.trim() || undefined, helped: helped ?? undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(json.message ?? 'No se pudo guardar.'); return; }
    setStreak(json.streak ?? null);
    setPhase('done');
    track('moment_completed', { moment: moment.id, mood_delta: moodBefore && moodAfter ? moodAfter - moodBefore : null });
  }

  async function improve() {
    if (!runId) return;
    setImproving(true);
    const res = await fetch(`/api/moments-flow/${moment.id}/improve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId }),
    });
    const json = await res.json().catch(() => ({}));
    setImproving(false);
    if (!res.ok) { toast(json.message ?? 'No se pudo preparar la mejora.'); return; }
    setProposal(json as Proposal);
  }

  async function accept() {
    if (!proposal) return;
    setBusy(true);
    const res = await fetch(`/api/moments-flow/${moment.id}/versions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: proposal.blocks, note: proposal.note }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(json.message ?? 'No se pudo guardar la versión.'); return; }
    toast(`Guardada tu versión ${json.version}`);
    router.push(`/m/${json.id}`);
  }

  const caption = <p className="mt-1 text-sm italic text-soi-muted">{moment.title}{moment.author ? ` · ${moment.author}` : ''}<span className="sr-only"> — fuente: {moment.source}</span></p>;

  /* ---------- Antes ---------- */
  if (phase === 'before') {
    return (
      <Shell title={moment.title} onExit={`/m/${moment.id}`}>
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <p className="text-[15px] text-soi-muted">{moment.objective}</p>
          <fieldset>
            <legend className="text-sm font-medium">¿Cómo llegas?</legend>
            <div className="mt-2 flex gap-1">
              {MOODS.map((m, i) => (
                <button key={m} type="button" onClick={() => setMoodBefore(i + 1)} aria-pressed={moodBefore === i + 1} aria-label={`Ánimo ${i + 1} de 5`}
                  className={cn('press flex h-12 w-12 items-center justify-center rounded-full text-2xl', moodBefore === i + 1 ? 'bg-soi-accent-soft shadow-[0_0_0_1px_var(--color-soi-accent)]' : 'hover:bg-black/[0.04]')}>{m}</button>
              ))}
            </div>
          </fieldset>
          <ol className="flex w-full flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5 text-left">
            {blocks.map((b, i) => (
              <li key={b.id} className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 shadow-ring">
                <span className="nums w-5 text-xs text-soi-muted">{i + 1}</span>
                <Icon name={ACTIONS[b.type].icon} className="h-4 w-4 shrink-0 text-soi-accent" />
                <span className="flex-1 truncate text-[15px]">{b.title}</span>
                <span className="nums text-xs text-soi-muted">{fmt(blockSeconds(b))}</span>
              </li>
            ))}
          </ol>
          <Button size="lg" className="w-full" onClick={start} disabled={busy} variant={locked ? 'gold' : 'primary'}>
            {locked ? 'Comenzar (SOI+)' : busy ? 'Preparando…' : 'Comenzar'}
          </Button>
        </div>
        <UpgradeSheet open={sheet} onOpenChange={setSheet} title="Ejecutar Moments es parte de SOI+"
          description={`Puedes ver los pasos de «${moment.title}». Para vivirlo con temporizador, respiración y voz, pasa a SOI+.`} />
      </Shell>
    );
  }

  /* ---------- Ejecución ---------- */
  if (phase === 'run') {
    const out = outputs[shownBlock.id] ?? {};
    const timeUp = remaining <= 0 && !AUTO_ADVANCE.has(block.type);
    return (
      <Shell title={moment.title} onExit={`/m/${moment.id}`} progress={{ index, total: blocks.length }}
        voice={ttsAllowed ? { on: voiceOn, toggle: () => setVoiceOn((v) => !v) } : undefined}>
        <div className="flex flex-1 flex-col">
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-soi-tray" aria-hidden="true">
              <div key={index} className="h-full origin-left rounded-full bg-soi-accent transition-transform duration-1000 ease-linear"
                style={{ transform: `scaleX(${total ? 1 - remaining / total : 1})` }} />
            </div>
            <span className="nums w-12 text-right text-sm text-soi-muted" role="timer" aria-label={`Tiempo restante ${fmt(remaining)}`}>{timeUp ? '✓' : fmt(remaining)}</span>
          </div>

          <div key={shown} className={cn('flex flex-1 flex-col justify-center gap-5 py-8', stepPhase === 'out' ? 'animate-step-out' : 'animate-step-in')} aria-live="polite">
            <div className="text-center">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-soi-muted">
                <Icon name={ACTIONS[shownBlock.type].icon} className="h-3.5 w-3.5" /> {ACTIONS[shownBlock.type].label}
              </p>
              <h2 className="mt-1 text-balance text-2xl font-semibold tracking-tight">{shownBlock.title}</h2>
              {shownBlock.source && <p className="mt-1 text-xs italic text-soi-muted">{shownBlock.source}</p>}
            </div>
            <BlockRunner block={shownBlock} output={out} running={running} next={next} say={(t) => void say(t)}
              setOutput={(o) => setOutputs((all) => ({ ...all, [shownBlock.id]: o }))} />
          </div>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 pb-2">
            <button type="button" onClick={() => setRunning((r) => !r)} aria-label={running ? 'Pausar' : 'Reanudar'}
              className="press relative flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-ring">
              <Play className={cn('absolute h-5 w-5 transition-[opacity,transform,filter] duration-(--dur-fast) ease-out-strong', running ? 'scale-[0.8] opacity-0 blur-[1px]' : 'scale-100 opacity-100')} aria-hidden="true" />
              <Pause className={cn('absolute h-5 w-5 transition-[opacity,transform,filter] duration-(--dur-fast) ease-out-strong', running ? 'scale-100 opacity-100' : 'scale-[0.8] opacity-0 blur-[1px]')} aria-hidden="true" />
            </button>
            <Button size="lg" onClick={next}>{index + 1 >= blocks.length ? 'Terminar' : 'Siguiente'}</Button>
            <button type="button" onClick={skip} className="press h-12 rounded-lg px-3 text-sm text-soi-muted hover:text-soi-ink">Saltar</button>
          </div>
          {caption}
        </div>
      </Shell>
    );
  }

  /* ---------- Después: resultados y aprendizaje ---------- */
  if (phase === 'after') {
    return (
      <Shell title={moment.title} onExit={`/m/${moment.id}`}>
        <div className="flex animate-enter flex-col gap-5 py-6">
          <fieldset className="text-center">
            <legend className="text-lg font-medium">¿Cómo te sientes ahora?</legend>
            <div className="mt-2 flex justify-center gap-1">
              {MOODS.map((m, i) => (
                <button key={m} type="button" onClick={() => setMoodAfter(i + 1)} aria-pressed={moodAfter === i + 1} aria-label={`Ánimo ${i + 1} de 5`}
                  className={cn('press flex h-12 w-12 items-center justify-center rounded-full text-2xl', moodAfter === i + 1 ? 'bg-soi-accent-soft shadow-[0_0_0_1px_var(--color-soi-accent)]' : 'hover:bg-black/[0.04]')}>{m}</button>
              ))}
            </div>
          </fieldset>
          <div role="radiogroup" aria-label="¿Te ayudó?" className="grid grid-cols-2 gap-1 rounded-[14px] bg-soi-sidebar p-1.5">
            {[{ v: true, l: 'Me ayudó' }, { v: false, l: 'No del todo' }].map((o) => (
              <button key={o.l} type="button" role="radio" aria-checked={helped === o.v} onClick={() => setHelped(o.v)}
                className={cn('press h-10 rounded-lg text-sm', helped === o.v ? 'bg-white text-soi-ink shadow-ring' : 'text-soi-muted')}>{o.l}</button>
            ))}
          </div>
          <div>
            <Label htmlFor="learning">¿Qué funcionó? ¿Qué cambiarías?</Label>
            <Textarea id="learning" rows={3} maxLength={1000} value={learning} onChange={(e) => setLearning(e.target.value)} />
          </div>
          <Button size="lg" onClick={complete} disabled={busy}>{busy ? 'Guardando…' : 'Terminar'}</Button>
        </div>
      </Shell>
    );
  }

  /* ---------- Hecho: celebración + mejor versión ---------- */
  return (
    <Shell title={moment.title} onExit="/hoy">
      <div className="flex flex-col items-center gap-4 py-6 text-center" aria-live="polite">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 animate-celebrate rounded-full ring-2 ring-soi-accent" />
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-soi-accent-soft text-soi-accent"><Check className="h-9 w-9" aria-hidden="true" /></span>
        </div>
        <h2 className="text-2xl font-semibold">Moment completado</h2>
        <p className="text-soi-muted">Cada acción es una evidencia de tu nueva identidad.</p>
        {streak && (
          <p className="nums inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
            <span className={cn('inline-flex', streak.milestone && 'animate-milestone')}><Flame className="h-5 w-5" aria-hidden="true" /></span>
            Racha: {streak.streak} días{streak.milestone ? ` · Hito de ${streak.milestone}: +1 escudo` : ''}
          </p>
        )}

        {!proposal ? (
          <div className="mt-2 grid w-full gap-2 sm:grid-cols-2">
            <Button onClick={improve} disabled={improving}><Sparkles className="h-4 w-4" aria-hidden="true" /> {improving ? 'Preparando tu versión…' : 'Mejorar mi Moment'}</Button>
            <Link href="/evidencias/nueva" className={buttonClass('outline')}><Star className="h-4 w-4" aria-hidden="true" /> Llevar al Muro</Link>
            <Link href="/hoy" className={buttonClass('ghost', 'md', 'sm:col-span-2')}>Volver a Hoy</Link>
          </div>
        ) : (
          <section aria-labelledby="v2" className="mt-2 w-full animate-enter rounded-[20px] bg-soi-sidebar p-3 text-left">
            <h3 id="v2" className="px-1 text-sm font-medium">Tu mejor versión{proposal.byAI ? '' : ' (sugerencia básica)'}</h3>
            <p className="px-1 pt-1 text-[15px] text-soi-muted">{proposal.note}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[{ l: 'Antes', b: proposal.current }, { l: 'Ahora', b: proposal.blocks }].map((col) => (
                <div key={col.l} className="rounded-[14px] bg-white p-3 shadow-ring">
                  <p className="text-xs font-medium text-soi-muted">{col.l}</p>
                  <ol className="mt-1 space-y-1">
                    {col.b.map((b) => (
                      <li key={`${col.l}-${b.id}`} className="flex items-center gap-2 text-sm">
                        <Icon name={ACTIONS[b.type].icon} className="h-3.5 w-3.5 shrink-0 text-soi-accent" />
                        <span className="flex-1 truncate">{b.title}</span>
                        <span className="nums text-xs text-soi-muted">{fmt(blockSeconds(b))}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={accept} disabled={busy}>{busy ? 'Guardando…' : 'Aceptar'}</Button>
              <Button variant="ghost" onClick={() => setProposal(null)} disabled={busy}>Descartar</Button>
            </div>
            <p className="mt-2 px-1 text-xs text-soi-muted">El original nunca cambia: esta versión es tuya.</p>
          </section>
        )}
      </div>
    </Shell>
  );
}

function Shell({ title, onExit, progress, voice, children }: {
  title: string; onExit: string; progress?: { index: number; total: number };
  voice?: { on: boolean; toggle: () => void }; children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-xl flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:min-h-dvh">
      <div className="flex items-center gap-2">
        {progress ? (
          <ol className="flex flex-1 gap-1" aria-label={`Paso ${progress.index + 1} de ${progress.total}`}>
            {Array.from({ length: progress.total }, (_, i) => (
              <li key={i} className={cn('h-1 flex-1 rounded-full', i < progress.index ? 'bg-soi-ink' : i === progress.index ? 'bg-soi-accent' : 'bg-soi-tray')} />
            ))}
          </ol>
        ) : <p className="flex-1 truncate text-sm text-soi-muted">{title}</p>}
        {voice && (
          <button type="button" onClick={voice.toggle} aria-pressed={voice.on} aria-label={voice.on ? 'Silenciar voz' : 'Activar voz'}
            className="press flex h-11 w-11 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
            {voice.on ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}
        <Link href={onExit} aria-label="Salir" className="press flex h-11 w-11 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  );
}
