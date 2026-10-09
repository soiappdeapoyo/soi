'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { blockSpeech } from '@/lib/moments/speech';
import type { VoiceStyle } from '@/config/voices';
import { unlockAudio } from '@/lib/voice/player';
import type { IdentityGain } from '@/lib/identity/gains';
import { toast } from 'sonner';
import { Check, Flame, MessageCircle, Pause, PenLine, Play, Sparkles, Star, Volume2, VolumeX, X } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { UpgradeSheet } from '@/components/paywall/upgrade-sheet';
import { track } from '@/components/providers/analytics';
import { ACTIONS, blockSeconds, type ActionBlock } from '@/config/actions';
import { AUTO_ADVANCE, BlockRunner, MOODS, type BlockOutput } from './block-runners';
import { cn } from '@/lib/utils';
import { leftAgo, runProgress } from '@/lib/moments/progress';

type Props = {
  /** cover: portada (encabezado al empezar y fondo suave al terminar; nunca durante los pasos). */
  moment: { id: string; title: string; objective: string; source: string; author: string | null; cover?: string | null };
  blocks: ActionBlock[];
  locked: boolean;
  /** Reto: día que se juega hoy. */
  challenge?: { day: number; total: number } | null;
  ttsAllowed: boolean;
  voice?: string | null;
  /** Lista de reproducción de Hoy: número, total y lo que sigue. */
  playlist?: { position: number; total: number; next: { href: string; title: string; minutes: number } | null } | null;
  /** Empezar sin pantalla previa (al pasar solo al siguiente Moment de la lista). */
  autoStart?: boolean;
  /** false en cuentas de creador: sin "Mejorar mi Moment" (la IA no genera su contenido). */
  aiContent?: boolean;
  /** Ejecución que quedó a medias (una interrupción): se ofrece retomar donde la dejó. */
  resume?: Resume | null;
};

export type Resume = {
  runId: string; moodBefore: number | null; outputs: Record<string, unknown>; lastActiveAt: string;
  index: number; remaining: number; progress: number; restartedStep: boolean;
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
/** De dónde se abrió el Moment (chat, Hoy…), para medir en PostHog qué propuestas se viven. */
const fromParam = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('from') ?? (window.location.search.includes('lista=hoy') ? 'hoy' : null));

export function MomentPlayer({ moment, blocks, locked, challenge, ttsAllowed, voice, playlist, autoStart, aiContent = true, resume }: Props) {
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
  // Retro sin fricción: el texto es opcional y se abre solo si la persona quiere hablar.
  const [talk, setTalk] = useState<null | 'choose' | 'write'>(null);
  const [helped, setHelped] = useState<boolean | null>(null);
  const [streak, setStreak] = useState<StreakInfo>(null);
  const [challengeDone, setChallengeDone] = useState<{ day: number; completed: number; finished: boolean } | null>(null);
  const [gain, setGain] = useState<IdentityGain | null>(null);
  const [victories, setVictories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [improving, setImproving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [resumeOffer, setResumeOffer] = useState<Resume | null>(locked ? null : resume ?? null);
  // Algo de afuera interrumpió (llamada, otra app, bloqueo de pantalla): se pausó solo.
  const [interrupted, setInterrupted] = useState(false);
  const outputsRef = useRef(outputs);
  outputsRef.current = outputs;

  const block = blocks[index]!;
  const shownBlock = blocks[shown]!;
  const total = blockSeconds(block);

  const say = useCallback(async (text: string, style: VoiceStyle = 'guide') => {
    if (!voiceOn || !ttsAllowed) return;
    try {
      const { speak } = await import('@/lib/voice/tts');
      await speak(text, { style });
    } catch { /* TTS opcional */ }
  }, [voiceOn, ttsAllowed]);
  // Indicaciones breves (Inhala, Exhala, "Diez segundos más"…): no interrumpen una explicación en curso.
  // La respiración (estilo breath) siempre suena; las demás indicaciones no interrumpen.
  const cue = useCallback((text: string, style: VoiceStyle = 'guide') => {
    if (!voiceOn || !ttsAllowed) return;
    void import('@/lib/voice/tts').then(({ cue: c, cueNow }) => (style === 'breath' ? cueNow(text, style) : c(text, style))).catch(() => {});
  }, [voiceOn, ttsAllowed]);
  void voice;

  const saveOutputs = useCallback((id: string | null, data: Record<string, BlockOutput>) => {
    if (!id) return;
    fetch(`/api/moment-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outputs: data }) }).catch(() => {});
  }, []);

  // Avance (paso, segundos que quedaban, %): se guarda al cambiar de paso, al pausar, cada 15 s y si algo interrumpe.
  const live = useRef({ runId, phase, index, remaining, running });
  live.current = { runId, phase, index, remaining, running };
  const lastSaved = useRef('');
  const saveProgress = useCallback(() => {
    const { runId: id, phase: ph, index: i, remaining: r } = live.current;
    const b = blocks[i];
    if (!id || ph !== 'run' || !b) return;
    const body = JSON.stringify({ progress: { index: i, blockId: b.id.slice(0, 64), remaining: Math.max(0, Math.round(r)), pct: runProgress(blocks, i, r) } });
    if (body === lastSaved.current) return; // pausar y cambiar de paso a la vez no lo guarda dos veces
    lastSaved.current = body;
    fetch(`/api/moment-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }, [blocks]);
  const flush = useCallback(() => { saveOutputs(live.current.runId, outputsRef.current); saveProgress(); }, [saveOutputs, saveProgress]);

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

  useEffect(() => { if (phase === 'run') saveProgress(); }, [index, phase, saveProgress]);
  useEffect(() => { if (phase === 'run' && !running) saveProgress(); }, [running, phase, saveProgress]);
  useEffect(() => { if (phase === 'run' && running && remaining > 0 && remaining % 15 === 0) saveProgress(); }, [remaining, running, phase, saveProgress]);

  // Interrupciones: si la app pasa a segundo plano, se pausa sola (y calla la voz) y se guarda todo.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden' || live.current.phase !== 'run') return;
      if (live.current.running) setInterrupted(true);
      setRunning(false);
      void import('@/lib/voice/tts').then(({ stopSpeaking }) => stopSpeaking()).catch(() => {});
      flush();
    };
    const onPageHide = () => { if (live.current.phase === 'run') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onPageHide); };
  }, [flush]);
  // Salir con la X (navegación dentro de la app): también se guarda.
  useEffect(() => () => { if (live.current.phase === 'run') flush(); }, [flush]);

  // La guía acompaña el tiempo: a mitad de una meditación larga y al cerrar los bloques temporizados.
  useEffect(() => {
    if (phase !== 'run' || !running) return;
    const elapsed = total - remaining;
    if ((block.type === 'meditation' || block.type === 'visualization') && total >= 120 && elapsed === Math.floor(total / 2)) {
      cue('Si tu mente se fue, no pasa nada. Vuelve con suavidad a tu respiración.', 'calm');
    }
    if (remaining === 10 && total >= 40) {
      if (block.type === 'meditation' || block.type === 'visualization') cue('Poco a poco, vuelve a este momento.', 'calm');
      else if (block.type === 'timer' || block.type === 'rest') cue('Diez segundos más.', 'guide');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // Transición del paso: primero sale, luego entra.
  useEffect(() => {
    if (index === shown) return;
    setStepPhase('out');
    const t = setTimeout(() => { setShown(index); setStepPhase('in'); }, 120);
    return () => clearTimeout(t);
  }, [index, shown]);

  // La voz lee el bloque completo: título e instrucciones (las meditaciones guiadas, enteras y pausadas).
  useEffect(() => {
    if (phase !== 'run') return;
    const { text, style } = blockSpeech(block);
    if (block.type === 'breathing') {
      // Respiración: la guía es "Inhala… / Exhala…" desde el primer segundo (las indicaciones se precargan).
      void import('@/lib/voice/tts').then(({ prefetchSpeech, stopSpeaking }) => {
        stopSpeaking();
        prefetchSpeech('Inhala…', 'breath');
        prefetchSpeech('Exhala…', 'breath'); prefetchSpeech('Sostén…', 'breath');
      }).catch(() => {});
    } else {
      void say(text, style);
    }
    // El audio del siguiente paso se prepara mientras se vive este (sin espera al avanzar).
    const following = blocks[index + 1];
    if (following && voiceOn && ttsAllowed) {
      const n = blockSpeech(following);
      void import('@/lib/voice/tts').then(({ prefetchSpeech }) => {
        if (following.type === 'breathing') { prefetchSpeech('Inhala…', 'breath'); prefetchSpeech('Exhala…', 'breath'); prefetchSpeech('Sostén…', 'breath'); }
        else prefetchSpeech(n.text, n.style);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  // La voz del primer paso se prepara desde que se abre el reproductor (mientras eliges cómo llegas): empieza sin espera.
  useEffect(() => {
    if (!voiceOn || !ttsAllowed || !blocks[0]) return;
    const first = blocks[0];
    void import('@/lib/voice/tts').then(({ prefetchSpeech }) => {
      if (first.type === 'breathing') { prefetchSpeech('Inhala…', 'breath'); prefetchSpeech('Exhala…', 'breath'); prefetchSpeech('Sostén…', 'breath'); }
      else { const s = blockSpeech(first); prefetchSpeech(s.text, s.style, 3); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silenciar corta la lectura en curso; al salir del reproductor, también.
  useEffect(() => {
    if (voiceOn) return;
    void import('@/lib/voice/tts').then(({ stopSpeaking }) => stopSpeaking());
  }, [voiceOn]);
  useEffect(() => () => { void import('@/lib/voice/tts').then(({ stopSpeaking }) => stopSpeaking()); }, []);

  async function start() {
    if (locked) { setSheet(true); return; }
    // Este toque habilita la voz en iOS para todo el Moment.
    if (voiceOn && ttsAllowed) unlockAudio();
    setBusy(true);
    const res = await fetch('/api/moment-runs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moment: moment.id, moodBefore: moodBefore ?? undefined, challengeDay: challenge?.day }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 402) { setSheet(true); return; }
    if (!res.ok) { toast(json.message ?? 'No se pudo empezar.'); return; }
    setRunId(json.id);
    setPhase('run');
    setRunning(true);
    track('moment_started', { moment: moment.id, from: fromParam() });
  }

  /** Retoma la ejecución anterior donde quedó (sin crear otra: lo escrito y el ánimo de antes se conservan). */
  function resumeRun() {
    const r = resumeOffer;
    if (!r) return;
    if (voiceOn && ttsAllowed) unlockAudio();
    const saved = r.outputs as Record<string, BlockOutput>;
    outputsRef.current = saved;
    setOutputs(saved);
    setMoodBefore(r.moodBefore);
    setRunId(r.runId);
    setIndex(r.index);
    setShown(r.index);
    setRemaining(r.remaining);
    setResumeOffer(null);
    setPhase('run');
    setRunning(true);
    if (r.restartedStep) toast('Retomamos desde el inicio de este paso.');
    track('moment_resumed', { moment: moment.id, from: fromParam(), progress: r.progress, restarted_step: r.restartedStep });
  }

  function continueAfterInterruption() {
    setInterrupted(false);
    setRunning(true);
    cue('Seguimos.', 'guide');
  }

  // Lista de Hoy: al pasar solo al siguiente, empieza sin pantalla previa (la voz ya quedó habilitada con el primer toque).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current || phase !== 'before') return;
    autoStarted.current = true;
    if (resumeOffer) resumeRun(); else void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  async function complete(opts?: { toChat?: boolean }) {
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
    track('moment_completed', { moment: moment.id, from: fromParam(), mood_delta: moodBefore && moodAfter ? moodAfter - moodBefore : null });
    // Hablar con SOI: el chat empieza nuevo y sabe qué Moment acabas de vivir.
    if (opts?.toChat) { router.push(`/chat?nueva=1&run=${runId}`); return; }
    setStreak(json.streak ?? null);
    setChallengeDone(json.challenge ?? null);
    setGain(json.identity ?? null);
    setVictories(json.victories ?? []);
    setPhase('done');
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
      <Shell title={moment.title} onExit={playlist ? '/hoy' : `/m/${moment.id}`}>
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          {/* Encabezado tipo artículo: la portada es la protagonista solo aquí, antes de empezar. */}
          {moment.cover ? (
            <div className="relative -mt-2 w-full overflow-hidden rounded-[20px] text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={moment.cover} alt="" className="aspect-[16/10] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                {(playlist || challenge) && <p className="nums text-xs font-medium text-white/85">{playlist ? `Tu día · ${playlist.position} de ${playlist.total}` : `Día ${challenge!.day} de ${challenge!.total}`}</p>}
                <h2 className="mt-0.5 text-balance text-xl font-semibold leading-snug [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{moment.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-white/90">{moment.objective}</p>
              </div>
            </div>
          ) : (
            <>
              {playlist && <p className="nums text-sm text-soi-muted">Tu día · {playlist.position} de {playlist.total}</p>}
              {challenge && <p className="nums rounded-lg bg-soi-accent-soft px-3 py-1 text-sm font-medium text-soi-accent">Día {challenge.day} de {challenge.total}</p>}
              <p className="text-[15px] text-soi-muted">{moment.objective}</p>
            </>
          )}
          {resumeOffer ? (
            <ResumeCard r={resumeOffer} step={blocks[resumeOffer.index]?.title ?? ''} total={blocks.length}
              onResume={resumeRun} onRestart={() => { setResumeOffer(null); track('moment_restarted', { moment: moment.id, progress: resumeOffer.progress }); }} />
          ) : (
          <fieldset>
            <legend className="text-sm font-medium">¿Cómo llegas?</legend>
            <div className="mt-2 flex gap-1">
              {MOODS.map((m, i) => (
                <button key={m} type="button" onClick={() => setMoodBefore(i + 1)} aria-pressed={moodBefore === i + 1} aria-label={`Ánimo ${i + 1} de 5`}
                  className={cn('press flex h-12 w-12 items-center justify-center rounded-full text-2xl', moodBefore === i + 1 ? 'bg-soi-accent-soft shadow-[0_0_0_1px_var(--color-soi-accent)]' : 'hover:bg-black/[0.04]')}>{m}</button>
              ))}
            </div>
          </fieldset>
          )}
          <ol className="flex w-full flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5 text-left">
            {blocks.map((b, i) => (
              <li key={b.id} className={cn('flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 shadow-ring', resumeOffer && i < resumeOffer.index && 'bg-white/60 shadow-none')}>
                <span className="nums flex w-5 justify-center text-xs text-soi-muted">{resumeOffer && i < resumeOffer.index ? <Check className="h-3.5 w-3.5 text-soi-accent" aria-label="Hecho" /> : i + 1}</span>
                <Icon name={ACTIONS[b.type].icon} className="h-4 w-4 shrink-0 text-soi-accent" />
                <span className="flex-1 truncate text-[15px]">{b.title}</span>
                <span className="nums text-xs text-soi-muted">{fmt(blockSeconds(b))}</span>
              </li>
            ))}
          </ol>
          {!resumeOffer && (
            <Button size="lg" className="w-full" onClick={start} disabled={busy} variant={locked ? 'gold' : 'primary'}>
              {locked ? 'Comenzar (SOI+)' : busy ? 'Preparando…' : 'Comenzar'}
            </Button>
          )}
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
      <Shell title={moment.title} onExit={playlist ? '/hoy' : `/m/${moment.id}`} progress={{ index, total: blocks.length, pct: runProgress(blocks, index, remaining) }}
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
            <BlockRunner block={shownBlock} output={out} running={running} next={next} say={(t) => void say(t)} cue={cue}
              elapsed={Math.max(0, total - remaining)} runId={runId}
              setOutput={(o) => setOutputs((all) => ({ ...all, [shownBlock.id]: o }))} />
          </div>

          {interrupted && !running && (
            <div role="status" className="mb-3 animate-enter rounded-[20px] bg-soi-sidebar p-1.5">
              <div className="flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-ring">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">Te esperamos aquí</span>
                  <span className="nums block text-sm text-soi-muted">Pausamos mientras no estabas. Tu avance está guardado ({runProgress(blocks, index, remaining)} %).</span>
                </span>
                <Button onClick={continueAfterInterruption} autoFocus>Continuar</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 pb-2">
            <button type="button" onClick={() => { setInterrupted(false); setRunning((r) => !r); }} aria-label={running ? 'Pausar' : 'Reanudar'}
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
          {talk === 'write' ? (
            <div className="animate-enter">
              <Label htmlFor="learning">¿Qué funcionó? ¿Qué cambiarías?</Label>
              <Textarea id="learning" rows={3} maxLength={1000} autoFocus value={learning} onChange={(e) => setLearning(e.target.value)} />
            </div>
          ) : talk === 'choose' ? (
            <div className="grid animate-enter grid-cols-2 gap-2">
              <Button variant="outline" className="whitespace-nowrap px-2 text-sm" onClick={() => setTalk('write')}><PenLine className="h-4 w-4" aria-hidden="true" /> Escribirlo aquí</Button>
              <Button variant="outline" className="whitespace-nowrap px-2 text-sm" onClick={() => complete({ toChat: true })} disabled={busy}><MessageCircle className="h-4 w-4" aria-hidden="true" /> Hablar con SOI</Button>
            </div>
          ) : (
            <button type="button" onClick={() => setTalk('choose')} className="press mx-auto text-sm text-soi-accent underline underline-offset-4">¿Quieres hablar sobre esto?</button>
          )}
          <Button size="lg" onClick={() => complete()} disabled={busy}>{busy ? 'Guardando…' : 'Terminar'}</Button>
        </div>
      </Shell>
    );
  }

  /* ---------- Hecho: celebración + mejor versión ---------- */
  return (
    <Shell title={moment.title} onExit="/hoy">
      <div className="relative isolate flex flex-col items-center gap-4 py-6 text-center" aria-live="polite">
        {/* La portada como fondo suave que se desvanece: cierra el Moment con su misma atmósfera. */}
        {moment.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={moment.cover} alt="" aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-2 -z-10 h-56 w-full rounded-[20px] object-cover opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        )}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 animate-celebrate rounded-full ring-2 ring-soi-accent" />
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-soi-accent-soft text-soi-accent"><Check className="h-9 w-9" aria-hidden="true" /></span>
        </div>
        {/* No "actividad completada": acabas de cambiar una parte de quién eres. */}
        <h2 className="text-balance text-2xl font-semibold">{gain?.identities.length ? 'Acabas de fortalecer quién eres' : challengeDone ? (challengeDone.finished ? 'Reto completado' : `Día ${challengeDone.day} completado`) : 'Una evidencia más de quién eres'}</h2>
        {challengeDone && !challengeDone.finished && challenge && <p className="nums text-sm text-soi-muted">{challengeDone.completed} de {challenge.total} días · mañana sigue el día {challengeDone.day + 1}</p>}
        {gain?.identities.length ? (
          <ul className="flex w-full flex-col gap-1.5">
            {gain.identities.map((i) => (
              <li key={i.id}>
                <Link href={`/mi-vida/yo/${i.id}`} className={cn('press flex items-center justify-between gap-3 rounded-[14px] p-3 text-left shadow-ring', i.levelUp ? 'animate-pop bg-soi-accent-soft' : 'bg-white')}>
                  <span className="min-w-0">
                    <span className="block text-xs text-soi-muted">Te estás convirtiendo en</span>
                    <span className="block truncate text-[17px] font-semibold">{i.name}</span>
                  </span>
                  <span className="nums shrink-0 text-right text-sm font-medium text-soi-accent">{i.levelUp ? `¡Nivel ${i.level}!` : `Nivel ${i.level}`}<span className="block text-xs font-normal text-soi-muted">{i.evidenceCount} evidencias</span></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : gain && !gain.hasIdentities ? (
          <Link href="/mi-vida?tab=nuevo-yo" className="press text-sm text-soi-accent underline underline-offset-4">Define en quién te estás convirtiendo y cada Moment contará</Link>
        ) : null}
        {victories.length > 0 && (
          <Link href="/mi-vida?tab=batallas" className="press animate-pop rounded-[14px] bg-soi-ink px-4 py-2.5 text-sm font-medium text-white">
            Le ganaste a {victories.join(' y a ')}
          </Link>
        )}
        {gain?.capacities.length ? (
          <p className="text-sm text-soi-muted">Entrenaste: {gain.capacities.map((c) => `${c.name}${c.levelUp ? ` (¡nivel ${c.level}!)` : ''}`).join(' · ')}</p>
        ) : null}
        {streak && (
          <p className="nums inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
            <span className={cn('inline-flex', streak.milestone && 'animate-milestone')}><Flame className="h-5 w-5" aria-hidden="true" /></span>
            Racha: {streak.streak} días{streak.milestone ? ` · Hito de ${streak.milestone}: +1 escudo` : ''}
          </p>
        )}

        {playlist && <UpNext playlist={playlist} />}

        {/* En la lista de Hoy lo que sigue es el siguiente Moment: sin más opciones que distraigan. */}
        {playlist ? null : !proposal ? (
          <div className="mt-2 grid w-full gap-2 sm:grid-cols-2">
            {aiContent && <Button onClick={improve} disabled={improving}><Sparkles className="h-4 w-4" aria-hidden="true" /> {improving ? 'Preparando tu versión…' : 'Mejorar mi Moment'}</Button>}
            <Link href="/evidencias/nueva" className={buttonClass('outline')}><Star className="h-4 w-4" aria-hidden="true" /> Llevar al Muro</Link>
            <Link href={`/impulso?compartir=${moment.id}`} className={buttonClass('outline', 'md', 'sm:col-span-2')}>Compartir cómo te fue en Impulso</Link>
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

/**
 * Lo que sigue en la lista de Hoy: cuenta regresiva de 8 s y pasa solo al siguiente (como una lista de
 * reproducción). Se puede quedar aquí. Sin cuenta regresiva con movimiento reducido: solo el botón.
 */
function UpNext({ playlist }: { playlist: NonNullable<Props['playlist']> }) {
  const router = useRouter();
  const [left, setLeft] = useState(8);
  const [stay, setStay] = useState(false);
  const next = playlist.next;
  useEffect(() => {
    if (!next || stay) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStay(true); return; }
    if (left <= 0) { router.push(next.href); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, stay, next, router]);

  if (!next) {
    return (
      <div className="w-full rounded-[20px] bg-soi-accent-soft p-4 text-center">
        <p className="text-[17px] font-semibold">Viviste todo tu día</p>
        <p className="mt-1 text-sm text-soi-muted">Lo que planeaste, lo hiciste. Eso es identidad.</p>
        <Link href="/hoy" className={buttonClass('primary', 'md', 'mt-3')}>Volver a Hoy</Link>
      </div>
    );
  }
  return (
    <div className="w-full rounded-[20px] bg-soi-sidebar p-3 text-left">
      <p className="px-1 text-xs font-medium text-soi-muted">A continuación</p>
      <Link href={next.href} className="press mt-2 flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-ring">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soi-ink text-white"><Play className="h-4 w-4" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{next.title}</span>
          <span className="nums block text-xs text-soi-muted">{next.minutes} min{!stay ? ` · empieza en ${left} s` : ''}</span>
        </span>
      </Link>
      {!stay && <button type="button" onClick={() => setStay(true)} className="press mt-1 w-full py-2 text-sm text-soi-muted">Quedarme aquí</button>}
    </div>
  );
}

/** Lo dejó a medias: dónde se quedó, cuánto lleva y la opción de seguir o empezar de nuevo. */
function ResumeCard({ r, step, total, onResume, onRestart }: { r: Resume; step: string; total: number; onResume: () => void; onRestart: () => void }) {
  return (
    <section aria-labelledby="retomar" className="w-full rounded-[20px] bg-soi-sidebar p-1.5 text-left">
      <div className="rounded-[14px] bg-white p-4 shadow-ring">
        <p className="text-xs font-medium text-soi-accent">Lo dejaste a medias · {leftAgo(r.lastActiveAt)}</p>
        <h2 id="retomar" className="mt-1 text-balance text-[17px] font-semibold leading-snug">Te quedaste en «{step}»</h2>
        <p className="nums mt-0.5 text-sm text-soi-muted">Paso {r.index + 1} de {total} · {r.progress} % hecho</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-valuenow={r.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avance">
          <div className="h-full origin-left rounded-full bg-soi-accent" style={{ transform: `scaleX(${r.progress / 100})` }} />
        </div>
        <Button size="lg" className="mt-4 w-full" onClick={onResume}><Play className="h-4 w-4 fill-current" aria-hidden="true" /> Retomar donde lo dejé</Button>
        <Button variant="ghost" className="mt-1 w-full text-soi-muted" onClick={onRestart}>Empezar de nuevo</Button>
      </div>
    </section>
  );
}

function Shell({ title, onExit, progress, voice, children }: {
  title: string; onExit: string; progress?: { index: number; total: number; pct: number };
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
        {progress && <span className="nums w-10 text-right text-xs text-soi-muted" aria-label={`Avance ${progress.pct} por ciento`}>{progress.pct} %</span>}
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
