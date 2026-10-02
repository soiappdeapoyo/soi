'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MIRROR_CARDS, TIME_OPTIONS, SOI_PRINCIPLE_LINE, type MirrorCardId } from '@/config/onboarding';
import { Button, buttonClass } from '@/components/ui/button';
import { Textarea, Label } from '@/components/ui/input';
import { track } from '@/components/providers/analytics';
import { cn } from '@/lib/utils';

type Result = {
  validation: string; reframe: string; microAction: string;
  routine: { id: string; label: string; author: string; minutes: number; source: string };
};

export function MirrorCards({ name }: { name: string }) {
  const router = useRouter();
  const [card, setCard] = useState<MirrorCardId | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!card || !minutes) return;
    setLoading(true); setError(null);
    const res = await fetch('/api/onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card, minutes, note: note || undefined }),
    });
    setLoading(false);
    if (!res.ok) { setError('No pudimos conectar con SOI. Intenta de nuevo.'); return; }
    setResult(await res.json());
    track('onboarding_completed', { card, minutes });
  }

  if (result) {
    return (
      <section className="flex flex-col gap-3" aria-live="polite">
        {/* La respuesta de la IA aparece una sola vez: fade + translateY(6px), stagger 40 ms */}
        <div className="animate-enter rounded-3xl bg-white p-5 shadow-soft">
          <p className="text-xs font-medium text-soi-muted">Te escucho</p>
          <p className="mt-1">{result.validation}</p>
        </div>
        <div className="animate-enter rounded-3xl bg-soi-accent-soft p-5 [animation-delay:40ms]">
          <p className="text-xs font-medium text-soi-accent">Principio SOI</p>
          <p className="mt-1 italic">“{SOI_PRINCIPLE_LINE}”</p>
          <p className="mt-2">{result.reframe}</p>
        </div>
        <div className="animate-enter rounded-3xl bg-white p-5 shadow-soft [animation-delay:80ms]">
          <p className="text-xs font-medium text-soi-muted">Tu micro-acción (24 h)</p>
          <p className="mt-1 font-medium">{result.microAction}</p>
        </div>
        <div className="animate-enter rounded-3xl bg-soi-ink p-5 text-white [animation-delay:120ms]">
          <p className="text-xs font-medium text-white/70">Rutina sugerida</p>
          <p className="mt-1 text-lg font-semibold">{result.routine.label} · {result.routine.minutes} min</p>
          <p className="text-sm text-white/75">{result.routine.author} — <em>{result.routine.source}</em></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/rutinas/${result.routine.id}`} className={buttonClass('gold', 'sm')}>Probar ahora</Link>
            <button type="button" onClick={() => router.push('/chat')} className={buttonClass('ghost', 'sm', 'text-white shadow-[0_0_0_1px_rgb(255_255_255/0.3)] hover:bg-white/10')}>Ir al chat</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Hola, {name}</h1>
        <p className="mt-1 text-soi-muted">¿Cuál de estos espejos se parece más a ti hoy?</p>
      </header>

      <fieldset>
        <legend className="sr-only">Elige un espejo emocional</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MIRROR_CARDS.map((c, i) => {
            const selected = card === c.id;
            const dimmed = card !== null && !selected;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCard(c.id)}
                aria-pressed={selected}
                // Stagger sutil de 40 ms (máx. 6 con retraso); press scale(0.97); las no elegidas bajan a 0.5.
                style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                className={cn(
                  'press flex animate-enter flex-col items-start gap-1 rounded-3xl bg-white p-4 text-left transition-[transform,opacity,box-shadow] duration-(--dur-base) ease-out-strong',
                  selected ? 'shadow-[0_0_0_2px_var(--color-soi-accent),0_8px_24px_rgb(0_0_0/0.06)]' : 'shadow-soft hover:shadow-raised',
                  dimmed && 'opacity-50 hover:opacity-80',
                )}
              >
                <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
                <span className="font-medium leading-tight">{c.title}</span>
                <span className="text-xs text-soi-muted">{c.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {card && (
        <fieldset className="flex animate-enter flex-col gap-3">
          <legend className="font-medium">¿Cuánto tiempo puedes dedicarte cada día?</legend>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((m) => (
              <button key={m} type="button" onClick={() => setMinutes(m)} aria-pressed={minutes === m}
                className={cn('press nums min-h-11 rounded-lg px-4', minutes === m ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:shadow-soft')}>
                {m} min
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="ob-note">¿Algo más que quieras contarme? (opcional)</Label>
            <Textarea id="ob-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Escribe con libertad…" />
          </div>
          <Button onClick={submit} disabled={!minutes || loading} variant="gold" size="lg" aria-busy={loading}>
            {loading ? 'SOI está pensando…' : 'Ver mi camino'}
          </Button>
          {error && <p role="alert" className="text-sm text-soi-danger">{error}</p>}
        </fieldset>
      )}
    </section>
  );
}
