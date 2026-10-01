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
      <section className="flex flex-col gap-4" aria-live="polite">
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <p className="text-xs font-semibold tracking-widest text-black/50">TE ESCUCHO</p>
          <p className="mt-1">{result.validation}</p>
        </div>
        <div className="rounded-3xl border border-soi-gold/40 bg-soi-gold/10 p-5">
          <p className="text-xs font-semibold tracking-widest text-black/50">PRINCIPIO SOI</p>
          <p className="mt-1 italic">“{SOI_PRINCIPLE_LINE}”</p>
          <p className="mt-2">{result.reframe}</p>
        </div>
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <p className="text-xs font-semibold tracking-widest text-black/50">TU MICRO-ACCIÓN (24 H)</p>
          <p className="mt-1 font-medium">{result.microAction}</p>
        </div>
        <div className="rounded-3xl bg-soi-ink p-5 text-white">
          <p className="text-xs font-semibold tracking-widest text-white/60">RUTINA SUGERIDA</p>
          <p className="mt-1 text-lg font-semibold">{result.routine.label} · {result.routine.minutes} min</p>
          <p className="text-sm text-white/70">{result.routine.author} — <em>{result.routine.source}</em></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/rutinas/${result.routine.id}`} className={buttonClass('gold', 'sm')}>Probar ahora</Link>
            <button onClick={() => router.push('/chat')} className={buttonClass('outline', 'sm', 'border-white/30 bg-transparent text-white hover:bg-white/10')}>Ir al chat</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Hola, {name} ✨</h1>
        <p className="mt-1 text-black/70">¿Cuál de estos espejos se parece más a ti hoy?</p>
      </header>

      <fieldset>
        <legend className="sr-only">Elige un espejo emocional</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MIRROR_CARDS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCard(c.id)}
              aria-pressed={card === c.id}
              className={cn('flex flex-col items-start gap-1 rounded-3xl border bg-white p-4 text-left transition',
                card === c.id ? 'border-soi-gold ring-2 ring-soi-gold' : 'border-black/10 hover:border-soi-gold/60')}
            >
              <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
              <span className="font-semibold leading-tight">{c.title}</span>
              <span className="text-xs text-black/60">{c.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {card && (
        <fieldset className="flex flex-col gap-3">
          <legend className="font-medium">¿Cuánto tiempo puedes dedicarte cada día?</legend>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((m) => (
              <button key={m} onClick={() => setMinutes(m)} aria-pressed={minutes === m}
                className={cn('rounded-full border px-4 py-2', minutes === m ? 'border-soi-ink bg-soi-ink text-white' : 'border-black/15 bg-white')}>
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
