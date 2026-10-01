'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, Pause, Play, SkipForward, X, Volume2, VolumeX, Star, Flame } from 'lucide-react';
import { ROUTINES, stepSeconds, type RoutineId } from '@/config/routines';
import { buttonClass } from '@/components/ui/button';
import { track } from '@/components/providers/analytics';
import { cn } from '@/lib/utils';

type Props = { routineId: RoutineId; locked?: boolean; ttsAllowed?: boolean; voice?: string | null };
type StreakInfo = { streak: number; milestone: number | null; used_shield: boolean } | null;

const R = 88;
const C = 2 * Math.PI * R;
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function RitualTimer({ routineId, locked = false, ttsAllowed = false, voice }: Props) {
  const routine = ROUTINES[routineId];
  const steps = routine.steps;
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(stepSeconds(steps[0]!));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [voiceOn, setVoiceOn] = useState(ttsAllowed);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakInfo>(null);
  const startedAt = useRef<number | null>(null);
  const completed = useRef<string[]>([]);

  const step = steps[index]!;
  const total = stepSeconds(step);
  const progress = useMemo(() => (total ? 1 - remaining / total : 0), [remaining, total]);

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
    if (!startedAt.current) { startedAt.current = Date.now(); void say(step.label); track('routine_started', { routineId }); }
    setRunning((r) => !r);
  };

  const header = (
    <header className="text-center">
      <h1 id="ritual-title" className="text-2xl font-bold">{routine.label}</h1>
      <p className="text-sm text-black/60">{routine.author} · <em>{routine.source}</em></p>
    </header>
  );

  if (locked) {
    return (
      <section aria-labelledby="ritual-title" className="rounded-3xl border border-black/10 bg-white p-6 text-center">
        {header}
        <div className="relative mt-6 rounded-2xl bg-black/5 p-6">
          <p className="select-none text-lg blur-sm" aria-hidden="true">{steps[0]!.label}</p>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Lock aria-hidden="true" className="h-8 w-8" />
            <p className="font-medium">La ejecución guiada es parte de SOI+</p>
          </div>
        </div>
        <ol className="mt-6 space-y-2 text-left text-sm text-black/70">
          {steps.map((s, i) => <li key={s.id}>{i + 1}. {s.label}</li>)}
        </ol>
        <Link href="/planes" className={buttonClass('gold', 'md', 'mt-6')}>Pasar a SOI+</Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className="rounded-3xl border border-black/10 bg-white p-8 text-center" aria-live="polite">
        <p className="text-5xl motion-safe:animate-bounce" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-2xl font-bold">¡Ritual completado!</h2>
        <p className="mt-1 text-black/70">Cada acción es una evidencia de tu nueva identidad.</p>
        {moodAfter === null ? (
          <fieldset className="mt-5">
            <legend className="text-sm font-medium">¿Cómo te sientes ahora?</legend>
            <div className="mt-2 flex justify-center gap-2">
              {MOODS.map((m, i) => (
                <button key={m} onClick={() => finish(i + 1)} className="rounded-full p-2 text-3xl hover:bg-black/5" aria-label={`Ánimo ${i + 1} de 5`}>{m}</button>
              ))}
            </div>
          </fieldset>
        ) : (
          <>
            {streak && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 font-semibold text-orange-700">
                <Flame className="h-5 w-5" aria-hidden="true" /> Racha: {streak.streak} días
                {streak.milestone && <span>· ¡Hito de {streak.milestone}! +1 escudo</span>}
              </p>
            )}
            {streak?.used_shield && <p className="mt-2 text-sm text-black/60">Tu Escudo de Racha protegió tu progreso. 🛡️</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href={`/evidencias/nueva?from=${routineId}`} className={buttonClass('primary')}>
                <Star aria-hidden="true" className="h-4 w-4" /> Guardar en Muro de Evidencias
              </Link>
              <Link href="/rutinas" className={buttonClass('outline')}>Volver</Link>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="ritual-title" className="flex flex-col items-center gap-6 rounded-3xl border border-black/10 bg-white p-6">
      {header}
      <p className="-mt-4 text-xs text-black/50">Paso {index + 1} de {steps.length}</p>

      {!startedAt.current && (
        <fieldset className="text-center">
          <legend className="text-sm font-medium">¿Cómo llegas hoy?</legend>
          <div className="mt-1 flex gap-1">
            {MOODS.map((m, i) => (
              <button key={m} onClick={() => setMoodBefore(i + 1)} aria-pressed={moodBefore === i + 1}
                className={cn('rounded-full p-1.5 text-2xl', moodBefore === i + 1 ? 'bg-soi-gold/30' : 'hover:bg-black/5')} aria-label={`Ánimo ${i + 1} de 5`}>{m}</button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="relative h-52 w-52" role="timer" aria-label={`Tiempo restante ${fmt(remaining)}`}>
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#0000000f" strokeWidth="10" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="#D4AF37" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-4xl font-semibold tabular-nums">{fmt(remaining)}</span>
      </div>

      <div className="text-center" aria-live="polite">
        <p className="text-xl font-medium leading-snug">{step.label}</p>
        {'quote' in step && step.quote && <p className="mt-2 italic text-black/70">“{step.quote}” — {routine.author}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggle} aria-label={running ? 'Pausar' : startedAt.current ? 'Reanudar' : 'Comenzar'} className="rounded-full bg-soi-ink p-4 text-white">
          {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>
        <button onClick={next} aria-label="Saltar paso" className="rounded-full border border-black/15 p-4">
          <SkipForward className="h-6 w-6" />
        </button>
        {ttsAllowed && (
          <button onClick={() => setVoiceOn((v) => !v)} aria-pressed={voiceOn} aria-label={voiceOn ? 'Silenciar voz' : 'Activar voz'} className="rounded-full border border-black/15 p-4">
            {voiceOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>
        )}
        <Link href="/rutinas" aria-label="Salir" className="rounded-full border border-black/15 p-4">
          <X className="h-6 w-6" />
        </Link>
      </div>
    </section>
  );
}
