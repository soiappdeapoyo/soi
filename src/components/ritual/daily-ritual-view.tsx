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
        <p className="text-xs font-semibold tracking-widest text-black/50">FASE · {phase.label.toUpperCase()} ({phase.desc})</p>
        <h1 className="text-3xl font-bold">Tu ritual de hoy</h1>
        <p className="text-sm text-black/60">Inspirado en: <em>{ritual.source}</em></p>
      </header>

      <ol className="flex flex-col gap-3">
        {PARTS.map((p, i) => (
          <li key={p.key} className={cn('rounded-3xl border bg-white p-5', checked.includes(p.key) ? 'border-soi-gold' : 'border-black/10')}>
            <div className="flex items-start gap-3">
              <button onClick={() => toggle(p.key)} aria-pressed={checked.includes(p.key)} aria-label={`Marcar ${p.label}`}
                className={cn('mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', checked.includes(p.key) ? 'border-soi-gold bg-soi-gold' : 'border-black/25')}>
                {checked.includes(p.key) && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
              <div className="flex-1">
                <p className="text-xs font-semibold tracking-widest text-black/50">{i + 1}. {p.label.toUpperCase()} → {p.eslabon}</p>
                <p className={cn('mt-1', p.key === 'affirmation' && 'text-lg font-semibold italic')}>{ritual[p.key]}</p>
                {ttsAllowed && <button onClick={() => listen(ritual[p.key])} className="mt-2 text-xs underline">Escuchar</button>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {result ? (
        <div className="rounded-3xl bg-soi-ink p-5 text-center text-white" aria-live="polite">
          <p className="inline-flex items-center gap-2 text-xl font-bold"><Flame className="h-6 w-6 text-orange-400" aria-hidden="true" /> {result.streak} días</p>
          {result.milestone && <p className="mt-1">¡Alcanzaste el hito de {result.milestone} días! Ganaste un Escudo de Racha 🛡️</p>}
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
