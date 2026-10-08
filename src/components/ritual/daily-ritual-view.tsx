'use client';

import { unlockAudio } from '@/lib/voice/player';
import { useState } from 'react';
import Link from 'next/link';
import { Check, Flame } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { RITUAL_PHASES, type RitualPhase } from '@/config/navigation';
import { cn } from '@/lib/utils';

type Ritual = {
  affirmation: string; visualization: string; action: string; signal: string; source: string; phase: RitualPhase;
  /** Brújula del día (rituales desde la v2). */
  intention?: string; embody?: string; ifThen?: string;
  compass?: { aim: string | null; identity: string | null; enemy: string | null };
};
type Key = 'affirmation' | 'visualization' | 'action' | 'signal';

const PARTS: { key: Key; label: string; eslabon: string }[] = [
  { key: 'affirmation', label: 'Afirmación', eslabon: 'Pensamiento' },
  { key: 'visualization', label: 'Visualización', eslabon: 'Emoción' },
  { key: 'action', label: 'Acción concreta', eslabon: 'Acción' },
  { key: 'signal', label: 'Señal a notar', eslabon: 'Resultado' },
];

export function DailyRitualView({ ritual, alreadyDone, ttsAllowed }: { ritual: Ritual; alreadyDone: boolean; ttsAllowed: boolean }) {
  const [checked, setChecked] = useState<Key[]>(alreadyDone ? PARTS.map((p) => p.key) : []);
  const [result, setResult] = useState<{ streak: number; milestone: number | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (k: Key) => setChecked((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  async function complete() {
    setSaving(true);
    const res = await fetch('/api/ritual/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedSteps: checked }),
    });
    setSaving(false);
    if (res.ok) setResult(((await res.json()) as { streak: { streak: number; milestone: number | null } }).streak);
  }

  async function listen(text: string) {
    unlockAudio(); // síncrono, dentro del toque (iOS)
    const { speak } = await import('@/lib/voice/tts');
    await speak(text, { style: 'calm' });
  }

  const phase = RITUAL_PHASES[ritual.phase] ?? RITUAL_PHASES.chispa;

  return (
    <section className="flex flex-col gap-4">
      <header>
        <p className="text-xs text-soi-muted">Fase · {phase.label} ({phase.desc})</p>
        <h1 className="text-3xl font-semibold">Tu ritual de hoy</h1>
        <p className="text-sm text-soi-muted">Inspirado en: <em>{ritual.source}</em></p>
      </header>

      {ritual.intention && (
        <section aria-labelledby="compass" className="rounded-[20px] bg-soi-ink p-5 text-white">
          <h2 id="compass" className="text-xs font-medium text-white/60">Brújula del día</h2>
          {ritual.compass?.aim && <p className="mt-2 text-sm text-white/70">Hoy avanzas hacia: <span className="text-white">{ritual.compass.aim}</span></p>}
          <p className="mt-2 text-balance text-[20px] font-semibold leading-snug">{ritual.intention}</p>
          <dl className="mt-4 flex flex-col gap-3 border-t border-white/15 pt-4 text-[15px] leading-relaxed">
            {ritual.embody && (
              <div>
                <dt className="text-xs text-white/60">{ritual.compass?.identity ? `Hoy eres ${ritual.compass.identity}` : 'Hoy eres tu mejor versión'}</dt>
                <dd className="mt-0.5">{ritual.embody}</dd>
              </div>
            )}
            {ritual.ifThen && (
              <div>
                <dt className="text-xs text-white/60">{ritual.compass?.enemy ? `Si aparece ${ritual.compass.enemy}` : 'Si algo te frena'}</dt>
                <dd className="mt-0.5">{ritual.ifThen}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <ol className="flex flex-col gap-2 rounded-[28px] bg-soi-tray p-2">
        {PARTS.map((p, i) => (
          <li key={p.key} style={{ animationDelay: `${i * 40}ms` }}
            className={cn('animate-enter rounded-[20px] bg-white p-5 transition-[box-shadow] duration-(--dur-fast) ease-out-strong',
              checked.includes(p.key) ? 'shadow-[0_0_0_2px_var(--color-soi-accent)]' : 'shadow-soft')}>
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => toggle(p.key)} aria-pressed={checked.includes(p.key)} aria-label={`Marcar ${p.label}`}
                className={cn('press tap-target mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  checked.includes(p.key) ? 'bg-soi-accent text-white' : 'bg-white shadow-[0_0_0_1.5px_rgb(0_0_0/0.3)]')}>
                <Check className={cn('h-4 w-4 transition-[opacity,transform] duration-(--dur-fast) ease-out-strong',
                  checked.includes(p.key) ? 'scale-100 opacity-100' : 'scale-[0.8] opacity-0')} aria-hidden="true" />
              </button>
              <div className="flex-1">
                <p className="text-xs text-soi-muted"><span className="nums">{i + 1}.</span> {p.label} → {p.eslabon}</p>
                <p className={cn('mt-1', p.key === 'affirmation' && 'text-lg font-semibold italic')}>{ritual[p.key]}</p>
                {ttsAllowed && <button type="button" onClick={() => listen(ritual[p.key])} className="press tap-target mt-2 rounded-md text-xs text-soi-muted underline hover:text-soi-ink">Escuchar</button>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {result ? (
        <div className="animate-enter rounded-[20px] bg-soi-ink p-5 text-center text-white" aria-live="polite">
          <p className="nums inline-flex items-center gap-2 text-xl font-semibold">
            {/* Hito 7/21/40/90: un solo pulso 1 → 1.06 → 1 (300 ms). Sin animación negativa al perder un día. */}
            <span className={cn('inline-flex', result.milestone && 'animate-milestone')}><Flame className="h-6 w-6 text-orange-400" aria-hidden="true" /></span>
            {result.streak} días
          </p>
          {result.milestone && <p className="mt-1">Alcanzaste el hito de {result.milestone} días. Ganaste un Escudo de Racha.</p>}
          <Link href="/evidencias/nueva?from=ritual" className={buttonClass('gold', 'sm', 'mt-4')}>Registrar una evidencia</Link>
        </div>
      ) : (
        <Button variant="gold" size="lg" onClick={complete} disabled={checked.length === 0 || saving || alreadyDone}>
          {alreadyDone ? 'Ritual de hoy completado ✓' : saving ? 'Guardando…' : 'Completar ritual'}
        </Button>
      )}
    </section>
  );
}
