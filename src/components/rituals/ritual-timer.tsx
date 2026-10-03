'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, Pause, Play, X, Volume2, VolumeX, Star, Flame, Check } from 'lucide-react';
import { ROUTINES, stepSeconds, type RoutineId } from '@/config/routines';
import { buttonClass } from '@/components/ui/button';
import { UpgradeSheet } from '@/components/paywall/upgrade-sheet';
import { track } from '@/components/providers/analytics';
import { cn } from '@/lib/utils';

type Props = { routineId: RoutineId; locked?: boolean; ttsAllowed?: boolean; voice?: string | null };
type StreakInfo = { streak: number; milestone: number | null; used_shield: boolean } | null;

const SIZE = 200;
const R = 96;
const C = 2 * Math.PI * R;
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * RitualTimer (DESIGN.md §5).
 * - Anillo SVG con stroke-dashoffset LINEAL (tiempo real), muestra el tiempo restante del paso.
 * - Halo de respiración (única animación expresiva): 4 s inhalar / 6 s exhalar, scale 1 → 1.12 + opacity; se pausa con el temporizador.
 * - Cambio de paso: sale -4px/120 ms, luego entra desde 6px/200 ms (nunca cruzados).
 * - Play ↔ pausa: cruce de íconos con opacity + scale(0.8 → 1) + blur leve, 150 ms.
 * - Al completar: un solo anillo que se expande y desvanece (800 ms) y luego el CTA al Muro.
 */
export function RitualTimer({ routineId, locked = false, ttsAllowed = false, voice }: Props) {
  const routine = ROUTINES[routineId];
  const steps = routine.steps;
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(stepSeconds(steps[0]!));
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [voiceOn, setVoiceOn] = useState(ttsAllowed);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakInfo>(null);
  const [sheet, setSheet] = useState(false);
  // Transición de texto del paso: primero sale, luego entra.
  const [shownIndex, setShownIndex] = useState(0);
  const [stepPhase, setStepPhase] = useState<'in' | 'out'>('in');
  const startedAt = useRef<number | null>(null);
  const completed = useRef<string[]>([]);

  const step = steps[index]!;
  const shownStep = steps[shownIndex]!;
  const total = stepSeconds(step);
  const remainingFrac = useMemo(() => (total ? remaining / total : 0), [remaining, total]);

  const say = useCallback(async (text: string) => {
    if (!voiceOn || !ttsAllowed) return;
    try {
      const { speak } = await import('@/lib/voice/tts');
      await speak(text, { voice: voice ?? undefined });
    } catch { /* TTS opcional */ }
  }, [voiceOn, ttsAllowed, voice]);

  const next = useCallback(() => {
    completed.current = [...new Set([...completed.current, steps[index]!.id])];
    if (index + 1 >= steps.length) {
      setRunning(false);
      setDone(true);
      return;
    }
    const n = index + 1;
    setIndex(n);
    setRemaining(stepSeconds(steps[n]!));
  }, [index, steps]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { next(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining, next]);

  useEffect(() => {
    if (index === shownIndex) return;
    setStepPhase('out');
    const t = setTimeout(() => { setShownIndex(index); setStepPhase('in'); }, 120);
    return () => clearTimeout(t);
  }, [index, shownIndex]);

  useEffect(() => {
    if (running) void say(step.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  async function finish(mood: number) {
    setMoodAfter(mood);
    const duration = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    track('routine_completed', { routineId, duration });
    const res = await fetch('/api/routines/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routineId, duration, steps: completed.current, moodBefore: moodBefore ?? undefined, moodAfter: mood }),
    }).catch(() => null);
    if (res?.ok) setStreak(((await res.json()) as { streak: StreakInfo }).streak);
  }

  const toggle = () => {
    if (locked) { setSheet(true); return; }
    if (!startedAt.current) {
      startedAt.current = Date.now();
      setStarted(true);
      void say(step.label);
      track('routine_started', { routineId });
    }
    setRunning((r) => !r);
  };

  const playLabel = running ? 'Pausar' : started ? 'Reanudar' : 'Comenzar';
  const caption = (
    <p className="mt-1.5 text-sm italic text-soi-muted">
      {routine.label} · {routine.author}
      <span className="sr-only"> — fuente: {routine.source}</span>
    </p>
  );

  /* ---------------- Completado ---------------- */
  if (done) {
    return (
      <section aria-labelledby="ritual-title" className="rounded-[28px] bg-soi-tray p-2">
        <div className="flex flex-col items-center rounded-[20px] bg-white px-4 py-8 text-center shadow-soft" aria-live="polite">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <span aria-hidden="true" className="absolute inset-0 animate-celebrate rounded-full ring-2 ring-soi-accent" />
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-soi-accent-soft text-soi-accent">
              <Check className="h-9 w-9" aria-hidden="true" />
            </span>
          </div>
          <h1 id="ritual-title" className="mt-4 text-2xl font-semibold">Ritual completado</h1>
          <p className="mt-1 text-soi-muted">Cada acción es una evidencia de tu nueva identidad.</p>

          {moodAfter === null ? (
            <fieldset className="mt-6 animate-enter [animation-delay:300ms]">
              <legend className="text-sm font-medium">¿Cómo te sientes ahora?</legend>
              <div className="mt-2 flex justify-center gap-1">
                {MOODS.map((m, i) => (
                  <button key={m} type="button" onClick={() => finish(i + 1)} aria-label={`Ánimo ${i + 1} de 5`}
                    className="press flex h-12 w-12 items-center justify-center rounded-full text-3xl hover:bg-black/[0.04]">{m}</button>
                ))}
              </div>
            </fieldset>
          ) : (
            <div className="mt-6 flex animate-enter flex-col items-center gap-3">
              {streak && (
                <p className="nums inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
                  <span className={cn('inline-flex', streak.milestone && 'animate-milestone')}><Flame className="h-5 w-5" aria-hidden="true" /></span>
                  Racha: {streak.streak} días
                  {streak.milestone && <span>· Hito de {streak.milestone}: +1 escudo</span>}
                </p>
              )}
              {streak?.used_shield && <p className="text-sm text-soi-muted">Tu Escudo de Racha protegió tu progreso.</p>}
              <div className="mt-2 grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
                <Link href={`/evidencias/nueva?from=${routineId}`} className={buttonClass('primary')}>
                  <Star className="h-4 w-4" aria-hidden="true" /> Guardar en Muro de Evidencias
                </Link>
                <Link href="/rutinas" className={buttonClass('outline')}>Volver</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ---------------- Temporizador ---------------- */
  return (
    <section aria-labelledby="ritual-title" className="rounded-[28px] bg-soi-tray p-2">
      <h1 id="ritual-title" className="sr-only">{routine.label} — {routine.author}</h1>
      {/* Tarjeta 24 px con p-4 y botones de 8 px → radios concéntricos */}
      <div className="flex flex-col items-center rounded-[20px] bg-white p-4 shadow-soft">
        <div className="flex w-full items-center justify-between">
          <p className="nums pl-1 text-xs text-soi-muted">Paso {index + 1} de {steps.length}</p>
          <div className="flex items-center">
            {ttsAllowed && !locked && (
              <button type="button" onClick={() => setVoiceOn((v) => !v)} aria-pressed={voiceOn} aria-label={voiceOn ? 'Silenciar voz' : 'Activar voz'}
                className="press flex h-11 w-11 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">
                {voiceOn ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
              </button>
            )}
            <Link href="/rutinas" aria-label="Salir" className="press flex h-11 w-11 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">
              <X className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {!started && !locked && (
          <fieldset className="mt-1 text-center">
            <legend className="text-sm text-soi-muted">¿Cómo llegas hoy?</legend>
            <div className="mt-1 flex gap-1">
              {MOODS.map((m, i) => (
                <button key={m} type="button" onClick={() => setMoodBefore(i + 1)} aria-pressed={moodBefore === i + 1} aria-label={`Ánimo ${i + 1} de 5`}
                  className={cn('press flex h-11 w-11 items-center justify-center rounded-full text-2xl', moodBefore === i + 1 ? 'bg-soi-accent-soft shadow-[0_0_0_1px_var(--color-soi-accent)]' : 'hover:bg-black/[0.04]')}>{m}</button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Círculo + halo de respiración */}
        <div className="relative my-6 flex items-center justify-center" style={{ width: SIZE, height: SIZE }} role="timer" aria-label={`Tiempo restante ${fmt(remaining)}`}>
          <span
            aria-hidden="true"
            data-breath-halo
            className={cn('absolute inset-0 rounded-full bg-soi-accent-soft', started && !locked ? 'animate-breathe' : 'opacity-35')}
            style={{ animationPlayState: running ? 'running' : 'paused' }}
          />
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative h-full w-full -rotate-90" aria-hidden="true">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="var(--color-soi-accent-soft)" stroke="rgb(0 0 0 / 0.08)" strokeWidth="2.5" />
            <circle
              key={index}
              cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke="var(--color-soi-accent)" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - remainingFrac)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className={cn('nums absolute inset-0 flex items-center justify-center text-5xl font-normal tracking-tight', locked && 'blur-sm')}>{fmt(remaining)}</span>
        </div>

        {/* Texto del paso: sale (-4px, 120 ms) y luego entra (6px, 200 ms) */}
        <div className="min-h-[3.5rem] w-full px-2 text-center" aria-live="polite">
          <p key={shownIndex} className={cn('text-lg leading-snug', stepPhase === 'out' ? 'animate-step-out' : 'animate-step-in', locked && 'select-none blur-sm')}>
            {shownStep.label}
          </p>
          {caption}
        </div>

        <div className="mt-5 grid w-full grid-cols-2 gap-3">
          <button type="button" onClick={toggle} aria-label={locked ? 'Comenzar (requiere SOI+)' : playLabel}
            className={buttonClass(locked ? 'gold' : 'secondary', 'lg', 'text-base font-normal')}>
            <span className="relative h-5 w-5" aria-hidden="true">
              <Play className={cn('absolute inset-0 h-5 w-5 transition-[opacity,transform,filter] duration-(--dur-fast) ease-out-strong',
                running ? 'scale-[0.8] opacity-0 blur-[1px]' : 'scale-100 opacity-100 blur-[0px]', locked && 'opacity-0')} />
              <Pause className={cn('absolute inset-0 h-5 w-5 transition-[opacity,transform,filter] duration-(--dur-fast) ease-out-strong',
                running ? 'scale-100 opacity-100 blur-[0px]' : 'scale-[0.8] opacity-0 blur-[1px]')} />
              {locked && <Lock className="absolute inset-0 h-5 w-5" />}
            </span>
            {playLabel}
          </button>
          <button type="button" onClick={locked ? () => setSheet(true) : next}
            className={buttonClass('secondary', 'lg', 'text-base font-normal')}>
            Saltar paso
          </button>
        </div>
      </div>

      {locked && (
        <ol className="mt-2 flex flex-col gap-1 px-4 py-3 text-sm text-soi-muted">
          {steps.map((s, i) => <li key={s.id}><span className="nums">{i + 1}.</span> {s.label}</li>)}
        </ol>
      )}

      <UpgradeSheet
        open={sheet}
        onOpenChange={setSheet}
        title="La ejecución guiada es parte de SOI+"
        description={`Puedes leer los pasos de ${routine.label}. Para practicarla con temporizador, respiración y voz, pasa a SOI+.`}
      />
    </section>
  );
}
