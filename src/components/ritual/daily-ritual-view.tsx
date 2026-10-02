'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Flame } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { RITUAL_PHASES, type RitualPhase } from '@/config/navigation';
import { cn } from '@/lib/utils';

type Ritual = { affirmation: string; visualization: string; action: string; signal: string; source: string; phase: RitualPhase };
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
    const { speak } = await import('@/lib/voice/tts');
    await speak(text);
  }

  const phase = RITUAL_PHASES[ritual.phase] ?? RITUAL_PHASES.chispa;

  return (
    <section className="flex flex-col gap-4">
      <header>
        <p className="text-xs text-soi-muted">Fase · {phase.label} ({phase.desc})</p>
        <h1 className="text-3xl font-semibold">Tu ritual de hoy</h1>
        <p className="text-sm text-soi-muted">Inspirado en: <em>{ritual.source}</em></p>
      </header>

      <ol className="flex flex-col gap-2 rounded-[32px] bg-soi-tray p-2">
        {PARTS.map((p, i) => (
          <li key={p.key} style={{ animationDelay: `${i * 40}ms` }}
            className={cn('animate-enter rounded-3xl bg-white p-5 transition-[box-shadow] duration-(--dur-fast) ease-out-strong',
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
        <div className="animate-enter rounded-3xl bg-soi-ink p-5 text-center text-white" aria-live="polite">
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
